from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import requests
import time
import logging
import os # Для работы с путями и Content-Type, если понадобится от файла
import shutil # Для копирования потока
from datetime import datetime
import uuid
import fal_client # <-- Добавить импорт в начало файла
from io import BytesIO # Для загрузки файла апскейла в R2
from urllib.parse import urlparse
import json # <-- Импорт для работы с JSON

from ..app import db
from ..models import GeneratedImage, AIModel, ModelStatus, GenerationType
from ..utils.image_utils import download_and_upload_to_r2 # <-- Импорт из utils
from ..utils.costs import check_balance_and_deduct, refund_action_cost # <--- Импорт утилиты
from ..utils.r2_utils import upload_file_to_r2, generate_presigned_get_url # Импортируем утилиты R2 для загрузки файла апскейла напрямую

bp = Blueprint('generation', __name__)

# Карта для преобразования aspectRatio (W:H) в image_size строки Fal.ai
# Это должно быть на бекенде, так как фронтенд теперь всегда шлет aspectRatio
ASPECT_RATIO_TO_IMAGE_SIZE_MAP = {
    '1:1': 'square_hd',        # или 'square_hd'
    '3:4': 'portrait_4_3',
    '4:3': 'landscape_4_3',
    '9:16': 'portrait_16_9',
    '16:9': 'landscape_16_9',
    # Дополните по необходимости или используйте значения по умолчанию, если маппинг не найден
}

# --- Вспомогательная функция для скачивания --- 
# УДАЛЕНО: Перенесено в backend/utils/image_utils.py
# def download_and_save_image(image_url, user_id, image_db_id):
#    ...
# --- Конец вспомогательной функции --- 

# Helper function to create DB records and form response
def _create_db_records_and_response(user_id, num_images, gen_type, fal_request_id, user_params, new_balance_after_deduct, ai_model_instance=None):
    created_images = []
    for _ in range(num_images):
        new_image = GeneratedImage(
            user_id=user_id,
            ai_model_id=ai_model_instance.id if ai_model_instance else None,
            generation_type=gen_type,
            prompt=user_params.get('prompt'),
            style=user_params.get('style'),
            camera_angle=user_params.get('cameraAngle'),
            emotion=user_params.get('emotion'),
            model_url=ai_model_instance.model_url if ai_model_instance else None,
            request_id=fal_request_id,
            status='Pending',
            r2_object_key=None,
            download_url=None
        )
        created_images.append(new_image)

    if not created_images:
        logging.error(f"[_create_db_records] No image records created for request {fal_request_id}")
        raise ValueError("Failed to create image records in helper") 

    db.session.add_all(created_images)
    db.session.commit()
    logging.info(f"[_create_db_records] Task {fal_request_id} DB records created. IDs: {[img.id for img in created_images]}")
    
    aspect_ratio_for_response = user_params.get('aspectRatio')
    # Ключ в ответе всегда будет 'aspectRatio' для консистентности на фронтенде
    # Нет необходимости проверять gen_type здесь, так как user_params всегда будет содержать aspectRatio
    # которое прислал фронтенд для данного типа запроса.

    response_data = {
        'images': [
            {**img.to_dict(), 'aspectRatio': aspect_ratio_for_response} 
            for img in created_images
        ],
        'new_balance': new_balance_after_deduct
    }
    return response_data

# NEW: Route for LoRA-based (Model Photo) generation
@bp.route('/lora-generate', methods=['POST'])
@login_required
def start_lora_generation():
    logging.info(f"[Gen LoRA] Route hit by user {current_user.id}")
    data = request.get_json()
    if not data:
        logging.warning("[Gen LoRA] Request body is not JSON")
        return jsonify({"error": "Request body must be JSON"}), 400

    ai_model_id = data.get('aiModelId')
    if not ai_model_id:
        return jsonify({"error": "aiModelId is required for LoRA generation"}), 400

    num_images = data.get('num_images', 1)
    action_type = 'model_photo' # Specific cost type for LoRA generation
    
    can_proceed, error_message, balance_info = check_balance_and_deduct(current_user.id, action_type, quantity=num_images)
    if not can_proceed:
        logging.warning(f"[Gen LoRA] User {current_user.id} failed balance check for {num_images}x '{action_type}': {error_message}")
        response_body = {"error": error_message or "Payment required or insufficient balance."}
        if balance_info is not None: response_body['current_balance'] = balance_info
        return jsonify(response_body), 402
    
    new_balance_after_deduct = balance_info
    logging.info(f"[Gen LoRA] User {current_user.id} passed balance check. New balance: {new_balance_after_deduct}. Proceeding.")

    prompt = data.get('prompt')
    finetune_strength_str = data.get('finetuneStrength') 
    # ПРИНИМАЕМ aspectRatio ОТ ФРОНТЕНДА
    aspect_ratio_from_frontend = data.get('aspectRatio', '1:1') # Дефолт, если не прислан
    output_format = data.get('output_format', 'jpeg')
    seed = data.get('seed')
    style = data.get('style') 
    camera_angle = data.get('cameraAngle') 
    emotion = data.get('emotion') 
    light = data.get('light')

    # Новые параметры с значениями по умолчанию из документации fal-ai/flux-lora
    num_inference_steps = data.get('num_inference_steps', 28)
    guidance_scale = data.get('guidance_scale', 3.5)

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    ai_model = AIModel.query.filter_by(id=ai_model_id, user_id=current_user.id).first()
    if not ai_model:
        return jsonify({"error": "AI Model not found or access denied"}), 404
    if ai_model.status != ModelStatus.READY:
        return jsonify({"error": f"AI Model is not ready. Current status: {ai_model.status.value}"}), 400
    if not ai_model.model_url: # This is the LoRA file URL
        logging.error(f"[Gen LoRA] Fal.ai LoRA URL (model_url) is missing for AIModel {ai_model_id}")
        return jsonify({"error": "LoRA URL from Fal.ai is missing for this model."}), 500

    lora_scale = 1.0 # Default scale
    if finetune_strength_str is not None:
        try:
            lora_scale = float(finetune_strength_str)
            if not (0.0 <= lora_scale <= 2.0):
                 logging.warning(f"[Gen LoRA] LoRA scale {lora_scale} is outside typical 0-2 range.")
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid finetuneStrength (scale) value."}), 400
            
    if not isinstance(num_images, int) or not (1 <= num_images <= 8):
        return jsonify({"error": "Number of images must be an integer between 1 and 8"}), 400

    # МАППИНГ aspectRatio в image_size
    image_size_for_fal = ASPECT_RATIO_TO_IMAGE_SIZE_MAP.get(aspect_ratio_from_frontend, 'landscape_4_3') # Дефолт, если нет в карте
    logging.info(f"[Gen LoRA] Input aspectRatio: {aspect_ratio_from_frontend}, Mapped to image_size: {image_size_for_fal}")

    # --- NEW: Descriptive mappings for Flux model ---
    STYLE_TO_PROMPT = {
        'Photorealistic': 'photorealistic, 8k, detailed',
        'Fashion Magazine': 'editorial fashion photo, magazine cover style, high fashion, sharp focus',
        'Vintage Film': 'analog film photo, 35mm film look, grainy, vintage colors, nostalgic',
        'Dreamy Look': 'dreamy ethereal portrait, soft focus, glowing light, pastel colors, romantic atmosphere',
        'Golden Hour': 'golden hour portrait, warm soft light, magical light, backlit',
        'Minimalist Style': 'minimalist aesthetic, clean background, neutral color palette, simple composition',
        'Noir Film': 'film noir style, black and white, high contrast, dramatic shadows',
        'Cyberpunk City': 'cyberpunk city background, neon-drenched, futuristic, Blade Runner aesthetic',
        'Fantasy Art': 'fantasy art style, epic, detailed, magical elements, Lord of the Rings vibe',
        'Gothic Vibe': 'gothic aesthetic, dark and moody, mysterious, victorian gothic elements',
        'Pop Art': 'pop art style, vibrant colors, comic book look, Andy Warhol inspired'
    }
    CAMERA_TO_PROMPT = {
        'Close-up': 'close-up portrait shot',
        'Medium shot': 'medium shot, waist up',
        'Full shot': 'full body shot, full view',
        'From above': 'shot from above, high angle view',
        'From below': 'shot from below, low angle view'
    }
    EMOTION_TO_PROMPT = {
        'Smiling': 'smiling face, happy expression',
        'Serious': 'serious expression, neutral face',
        'Happy': 'joyful expression, genuinely happy',
        'Sad': 'sad expression, melancholic mood',
        'Confident': 'confident expression, self-assured look',
        'Neutral': 'neutral expression',
        'Scared': 'scared expression, frightened look'
    }
    LIGHT_TO_PROMPT = {
        'Studio Light': 'professional studio lighting, softbox, high key',
        'Ring Light': 'ring light photography, circular catchlights in eyes',
        'Neon Light': 'neon lighting, cyberpunk aesthetic, vibrant glowing colors',
        'Dramatic Shadow': 'dramatic shadows, hard light, chiaroscuro'
    }
    # --- END of new mappings ---

    # --- Формирование комплексного промпта v2 ---
    base_prompt_from_user = data.get('prompt', '').strip()

    model_trigger_word = ai_model.trigger_word
    # Гарантируем, что эти поля будут строками или None
    model_age_str = str(ai_model.age) if ai_model.age is not None else None
    model_gender_str = str(ai_model.gender).strip() if ai_model.gender and str(ai_model.gender).strip() else None
    model_eye_color_str = str(ai_model.eye_color).strip() if ai_model.eye_color and str(ai_model.eye_color).strip() else None
    model_appearance_str = str(ai_model.appearance).strip() if ai_model.appearance and str(ai_model.appearance).strip() else None
    
    # Параметры из выпадающих списков фронтенда (уже извлечены как style, camera_angle, emotion)
    # Используем новые маппинги для получения описательного текста
    style_str = STYLE_TO_PROMPT.get(style)
    camera_angle_str = CAMERA_TO_PROMPT.get(camera_angle)
    emotion_str = EMOTION_TO_PROMPT.get(emotion)
    light_str = LIGHT_TO_PROMPT.get(light)

    prompt_parts = []

    if model_trigger_word:
        prompt_parts.append(model_trigger_word)

    if base_prompt_from_user:
        prompt_parts.append(base_prompt_from_user)

    # Собираем фразу про возраст, пол и цвет глаз
    person_details_parts = []
    if model_age_str:
        person_details_parts.append(f"{model_age_str} year old")
    if model_gender_str:
        person_details_parts.append(model_gender_str)
    if model_eye_color_str:
        if person_details_parts: # Если уже есть возраст/пол, добавляем "with"
            person_details_parts.append(f"with {model_eye_color_str} eyes")
        else: # Если только цвет глаз
            person_details_parts.append(f"{model_eye_color_str} eyes")
    
    if person_details_parts:
        prompt_parts.append(" ".join(person_details_parts))

    if model_appearance_str:
        prompt_parts.append(model_appearance_str)
    
    if emotion_str:
        prompt_parts.append(emotion_str)

    if camera_angle_str:
        prompt_parts.append(camera_angle_str)

    if light_str:
        prompt_parts.append(light_str)

    if style_str:
        prompt_parts.append(style_str)
            
    final_prompt = ", ".join(filter(None, prompt_parts))
    
    logging.info(f"[Gen LoRA] Original prompt: '{base_prompt_from_user}'")
    logging.info(f"[Gen LoRA] Constructed final prompt v2: '{final_prompt}'")
    # --- Конец формирования комплексного промпта v2 ---

    logging.info(f"[Gen LoRA] Preparing LoRA generation for model ID: {ai_model_id}, Num Images: {num_images}")

    try:
        fal_webhook_url = None
        webhook_base_url = current_app.config.get('WEBHOOK_BASE_URL') 
        if webhook_base_url:
             fal_webhook_url = f"{webhook_base_url.rstrip('/')}/api/generation/webhook" 
        else:
            logging.warning("[Gen LoRA] Webhook base URL not configured.")

        model_identifier = "fal-ai/flux-lora"
        fal_arguments = {
            "prompt": final_prompt, # Используем новый final_prompt
            "image_size": image_size_for_fal, # Используем смапленное значение
            "num_images": num_images,
            "output_format": output_format,
            "seed": seed,
            "enable_safety_checker": False, 
            "loras": [{"path": ai_model.model_url, "scale": lora_scale}],
            # Добавляем новые параметры
            "num_inference_steps": num_inference_steps,
            "guidance_scale": guidance_scale
        }
        fal_arguments = {k: v for k, v in fal_arguments.items() if v is not None}
        
        logging.info(f"[Gen LoRA] Submitting job to Fal.ai model: {model_identifier} with arguments: {fal_arguments}")
        handler = fal_client.submit(model_identifier, arguments=fal_arguments, webhook_url=fal_webhook_url)
        fal_request_id = handler.request_id
        logging.info(f"[Gen LoRA] Job submitted. Fal Request ID: {fal_request_id}")
        
        # В user_params передаем исходные данные от пользователя, включая оригинальный aspectRatio
        # Также сохраняем оригинальный промпт пользователя, если он нужен для истории
        user_params_for_db = {
            'prompt': base_prompt_from_user, # Сохраняем оригинальный промпт пользователя
            'style': style, 'cameraAngle': camera_angle, 'emotion': emotion, 'light': light,
            'aspectRatio': aspect_ratio_from_frontend # <--- Важно для ответа фронтенду
            # Можно добавить и final_prompt, если его нужно где-то отображать или использовать
        }
        response_data = _create_db_records_and_response(
            current_user.id, num_images, GenerationType.MODEL_PHOTO, 
            fal_request_id, user_params_for_db, new_balance_after_deduct, ai_model_instance=ai_model
        )
        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        logging.exception(f"[Gen LoRA] Error starting LoRA generation: {e}")
        try:
            logging.warning(f"[Gen LoRA] Refunding points for user {current_user.id} due to error: {e}")
            refund_action_cost(current_user.id, action_type, quantity=num_images, reason=f"LoRA generation start failed: {str(e)[:100]}")
        except Exception as refund_err:
            logging.exception(f"[Gen LoRA] CRITICAL: Failed to refund points for user {current_user.id}.")
        
        error_message_to_client = "An internal error occurred while starting LoRA generation."
        status_code_to_client = 500
        if hasattr(e, 'response') and e.response is not None:
             try: error_detail = e.response.json()
             except: error_detail = e.response.text
             error_message_to_client = f"Fal.ai API Error: {error_detail}"
             status_code_to_client = e.response.status_code
        return jsonify({"error": error_message_to_client}), status_code_to_client

# MODIFIED: Route for base Text-to-Image generation
@bp.route('/start', methods=['POST'])
@login_required
def start_base_generation(): # Renamed for clarity, path remains /start for now
    logging.info(f"[Gen Base] Route hit by user {current_user.id}")
    data = request.get_json()
    if not data:
        logging.warning("[Gen Base] Request body is not JSON")
        return jsonify({"error": "Request body must be JSON"}), 400

    # aiModelId should NOT be present for base generation through this endpoint
    if data.get('aiModelId'):
        return jsonify({"error": "aiModelId should not be provided for base text-to-image generation. Use /lora-generate for model-based generation."}), 400

    num_images = data.get('num_images', 1)
    action_type = 'text_to_image' 

    can_proceed, error_message, balance_info = check_balance_and_deduct(current_user.id, action_type, quantity=num_images)
    if not can_proceed:
        logging.warning(f"[Gen Base] User {current_user.id} failed balance check for {num_images}x '{action_type}': {error_message}")
        response_body = {"error": error_message or "Payment required or insufficient balance."}
        if balance_info is not None: response_body['current_balance'] = balance_info
        return jsonify(response_body), 402
    
    new_balance_after_deduct = balance_info
    logging.info(f"[Gen Base] User {current_user.id} passed balance check. New balance: {new_balance_after_deduct}. Proceeding.")

    prompt = data.get('prompt')
    aspect_ratio = data.get('aspectRatio', '16:9') # Default for flux-pro
    output_format = data.get('output_format', 'jpeg')
    seed = data.get('seed')
    # Style, camera, emotion are collected for user reference, not used by flux-pro directly
    style = data.get('style') 
    camera_angle = data.get('cameraAngle')
    emotion = data.get('emotion')

    # Новые параметры для flux-pro с значениями по умолчанию
    safety_tolerance = data.get('safety_tolerance', "6") # Default set to max tolerance
    raw_generation = data.get('raw', False) # Default assumed False

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400
            
    if not isinstance(num_images, int) or not (1 <= num_images <= 8):
        return jsonify({"error": "Number of images must be an integer between 1 and 8"}), 400

    logging.info(f"[Gen Base] Preparing base text-to-image generation. Num Images: {num_images}")

    try:
        fal_webhook_url = None
        webhook_base_url = current_app.config.get('WEBHOOK_BASE_URL')
        if webhook_base_url:
            fal_webhook_url = f"{webhook_base_url.rstrip('/')}/api/generation/webhook"
        else:
            logging.warning("[Gen Base] Webhook base URL not configured.")

        model_identifier = "fal-ai/flux-pro/v1.1-ultra" # Base model
        fal_arguments = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "num_images": num_images,
            "output_format": output_format,
            "seed": seed,
            "enable_safety_checker": False, # Disabled safety checker
            # Добавляем новые параметры
            "safety_tolerance": safety_tolerance, # Using max tolerance by default
            "raw": raw_generation
        }
        fal_arguments = {k: v for k, v in fal_arguments.items() if v is not None}
        
        logging.info(f"[Gen Base] Submitting job to Fal.ai model: {model_identifier} with arguments: {fal_arguments}")
        handler = fal_client.submit(model_identifier, arguments=fal_arguments, webhook_url=fal_webhook_url)
        fal_request_id = handler.request_id
        logging.info(f"[Gen Base] Job submitted. Fal Request ID: {fal_request_id}")
        
        db_params = {'prompt': prompt, 'style': style, 'cameraAngle': camera_angle, 'emotion': emotion, 'aspectRatio': aspect_ratio}
        response_data = _create_db_records_and_response(
            current_user.id, num_images, GenerationType.TEXT_TO_IMAGE, 
            fal_request_id, db_params, new_balance_after_deduct
        )
        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        logging.exception(f"[Gen Base] Error starting base generation: {e}")
        try:
            logging.warning(f"[Gen Base] Refunding points for user {current_user.id} due to error: {e}")
            refund_action_cost(current_user.id, action_type, quantity=num_images, reason=f"Base generation start failed: {str(e)[:100]}")
        except Exception as refund_err:
            logging.exception(f"[Gen Base] CRITICAL: Failed to refund points for user {current_user.id}: {refund_err}")
        
        error_message_to_client = "An internal error occurred while starting base generation."
        status_code_to_client = 500
        if hasattr(e, 'response') and e.response is not None:
             try: error_detail = e.response.json()
             except: error_detail = e.response.text
             error_message_to_client = f"Fal.ai API Error: {error_detail}"
             status_code_to_client = e.response.status_code
        return jsonify({"error": error_message_to_client}), status_code_to_client

@bp.route('/result/<int:image_id>', methods=['GET'])
@login_required
def get_generation_result(image_id):
    gen_image = GeneratedImage.query.filter_by(id=image_id, user_id=current_user.id).first_or_404()
    logging.info(f"[Gen Result] Checking image {image_id}, current status: {gen_image.status}, R2 key: {gen_image.r2_object_key}")
    return jsonify(gen_image.to_dict()), 200

@bp.route('/history', methods=['GET'])
@login_required
def get_generation_history():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int) # Например, 20 изображений на страницу
    
    paginated_query = GeneratedImage.query.filter_by(user_id=current_user.id).order_by(GeneratedImage.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    images = paginated_query.items
    
    return jsonify({
        'images': [img.to_dict() for img in images],
        'has_next': paginated_query.has_next,
        'next_page': paginated_query.next_num,
        'total_pages': paginated_query.pages,
        'current_page': paginated_query.page
    }), 200

# --- ВЕБХУК ДЛЯ ГЕНЕРАЦИИ Fal.ai --- 
@bp.route('/webhook', methods=['POST'])
def handle_fal_generation_webhook():
    logging.info("[Webhook Gen/Upscale/TryOn Fal] Received request.") # Updated log message
    # TODO: Реализовать верификацию (если Fal.ai ее предоставляет)
    
    try:
        data = request.get_json()
        if not data:
            logging.warning("[Webhook Gen/Upscale/TryOn Fal] Request body is not JSON or empty.")
            return jsonify({"error": "Invalid payload"}), 400
        
        logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Payload received: {data}")
        
        # Извлекаем ID запроса и статус (адаптировать под реальный формат Fal.ai)
        request_id = data.get("request_id") # Fal.ai может использовать другой ключ?
        fal_status = data.get("status") 
        model_id = data.get("model_id") # Полезно для логгирования
        
        if not request_id or not fal_status:
            logging.warning(f"[Webhook Gen/Upscale/TryOn Fal] Missing required fields (request_id, status) in payload: {data}")
            return jsonify({"error": "Missing required fields"}), 400
            
        db_images = GeneratedImage.query.filter_by(request_id=request_id).order_by(GeneratedImage.id).all()
        
        if not db_images:
            logging.error(f"[Webhook Gen/Upscale/TryOn Fal] Could not find ANY GeneratedImage for Fal Request ID '{request_id}'. Webhook ignored.")
            return jsonify({"message": "Generated image record not found, webhook ignored."}), 200
            
        # --- Обработка статуса и результата --- 
        fal_status_lower = fal_status.lower()
        
        if fal_status_lower == 'completed' or fal_status_lower == 'ok': 
            fal_payload = data.get("payload") # Используем 'payload' для Fal
            
            if not isinstance(fal_payload, dict):
                logging.error(f"[Webhook Gen/Upscale/TryOn Fal] Status is '{fal_status}' for {request_id}, but 'payload' is missing or not a dictionary. Setting all related records to Failed.")
                for img in db_images:
                    if img.status != 'Failed':
                        img.status = 'Failed'
                        img.updated_at = datetime.utcnow()
                db.session.commit()
                return jsonify({"message": "Webhook processed, but payload is not a dictionary."}), 200

            # --- Определение типа ответа (Генерация, Апскейл, Примерка) --- 
            result_images = []
            generation_type = db_images[0].generation_type

            if generation_type == GenerationType.UPSCALE:
                upscaled_image_data = fal_payload.get("image") # Upscaler specific key
                if isinstance(upscaled_image_data, dict):
                    result_images.append(upscaled_image_data)
                else:
                    logging.error(f"[Webhook Upscale Fal] Payload for upscale request {request_id} does not contain a valid 'image' object.")
                    for img in db_images:
                        if img.status != 'Failed':
                            img.status = 'Failed'
                            img.updated_at = datetime.utcnow()
                    db.session.commit()
                    return jsonify({"message": "Webhook processed, but upscale payload invalid."}), 200
            # Для Генерации (MODEL_PHOTO, TEXT_TO_IMAGE) и Примерки (TRY_ON) и Nano Banana (NANO_BANANA) ожидаем список "images"
            elif generation_type == GenerationType.MODEL_PHOTO or generation_type == GenerationType.TEXT_TO_IMAGE or generation_type == GenerationType.TRY_ON or generation_type == GenerationType.NANO_BANANA:
                 generated_images_list = fal_payload.get("images", []) # Common key for generators and try-on
                 if isinstance(generated_images_list, list):
                     result_images = generated_images_list
                 else:
                     log_prefix = "Gen"
                     if generation_type == GenerationType.TRY_ON:
                         log_prefix = "TryOn"
                     elif generation_type == GenerationType.NANO_BANANA:
                         log_prefix = "NanoBanana"
                     logging.error(f"[Webhook {log_prefix} Fal] Payload for request {request_id} does not contain a valid 'images' list.")
                     for img in db_images:
                         if img.status != 'Failed':
                             img.status = 'Failed'
                             img.updated_at = datetime.utcnow()
                     db.session.commit()
                     return jsonify({"message": f"Webhook processed, but {log_prefix.lower()} payload invalid."}), 200
            else:
                # Неизвестный тип генерации, что странно
                logging.error(f"[Webhook Unknown Fal] Unknown generation type '{generation_type}' for request {request_id}. Cannot process payload.")
                for img in db_images:
                     if img.status != 'Failed':
                         img.status = 'Failed'
                         img.updated_at = datetime.utcnow()
                db.session.commit()
                return jsonify({"message": "Webhook processed, but unknown generation type."}), 200

            # --- Общая логика обработки результатов (result_images) --- 
            if not result_images:
                logging.error(f"[Webhook Gen/Upscale/TryOn Fal] Status is '{fal_status}' for {request_id}, but no images found in the payload. Setting all related records to Failed.")
                for img in db_images:
                    if img.status != 'Failed':
                        img.status = 'Failed'
                        img.updated_at = datetime.utcnow()
                db.session.commit()
                return jsonify({"message": "Webhook processed, but no image data found in payload."}), 200

            logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Status '{fal_status}' for {request_id}. Received {len(result_images)} image result(s). Found {len(db_images)} DB records. Type: {generation_type}. Processing...")
            
            # Итерируем и обновляем записи в БД
            processed_count = 0
            failed_download_count = 0
            for i in range(min(len(db_images), len(result_images))):
                db_record = db_images[i]
                fal_result = result_images[i]

                if db_record.status == 'Ready' or db_record.status == 'Failed':
                    logging.warning(f"[Webhook Gen/Upscale/TryOn Fal] Skipping already processed DB record {db_record.id} (Status: {db_record.status}) for request {request_id}")
                    continue
                
                if not isinstance(fal_result, dict):
                    logging.error(f"[Webhook Gen/Upscale/TryOn Fal] Image result at index {i} is not a dictionary for request {request_id}. Setting record {db_record.id} to Failed.")
                    db_record.status = 'Failed'
                    db_record.updated_at = datetime.utcnow()
                    continue

                image_url = fal_result.get("url")
                image_width = fal_result.get("width") # Не все модели могут возвращать
                image_height = fal_result.get("height")

                if not image_url:
                    logging.error(f"[Webhook Gen/Upscale/TryOn Fal] No URL found for image at index {i} for request {request_id}. Setting record {db_record.id} to Failed.")
                    db_record.status = 'Failed'
                    db_record.updated_at = datetime.utcnow()
                    continue

                logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Processing record {db_record.id} (index {i}, Type: {generation_type}). URL: {image_url}. Attempting download & R2 upload...")
                db_record.download_url = image_url # Сохраняем исходный URL от Fal
                
                # Определяем тип сущности для R2 ключа (используем тип генерации)
                entity_type_for_r2 = db_record.generation_type.value # Используем значение enum, например, 'model_photo', 'upscale', 'try_on'
                
                r2_key = None
                try:
                    # Передаем db_record.id как image_db_id
                    r2_key = download_and_upload_to_r2(image_url, db_record.user_id, db_record.id, entity_type=entity_type_for_r2)
                except Exception as upload_exc:
                     logging.exception(f"[Webhook Gen/Upscale/TryOn Fal] EXCEPTION during R2 upload for record {db_record.id}, URL: {image_url}")
                     r2_key = None

                if r2_key:
                    logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Image {db_record.id} (Type: {generation_type}) uploaded to R2. Object Key: {r2_key}")
                    db_record.r2_object_key = r2_key
                    db_record.status = 'Ready'
                    db_record.is_downloaded = True
                    if image_width: db_record.width = image_width
                    if image_height: db_record.height = image_height
                    processed_count += 1
                else:
                    logging.error(f"[Webhook Gen/Upscale/TryOn Fal] R2 upload failed for image {db_record.id} (Type: {generation_type}). Setting status to Failed.")
                    db_record.status = 'Failed'
                    db_record.is_downloaded = False
                
                db_record.updated_at = datetime.utcnow()
            
            if len(db_images) > len(result_images):
                logging.warning(f"[Webhook Gen/Upscale/TryOn Fal] Fal returned less images ({len(result_images)}) than DB records ({len(db_images)}) for request {request_id}. Marking extra records as Failed.")
                for i in range(len(result_images), len(db_images)):
                    db_record = db_images[i]
                    if db_record.status == 'Pending':
                        db_record.status = 'Failed'
                        db_record.updated_at = datetime.utcnow()
            
            try:
                 db.session.commit()
                 logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Finished processing request {request_id}. Processed: {processed_count}, Failed Downloads: {failed_download_count}. Committed.")
            except Exception as commit_exc:
                 db.session.rollback()
                 logging.exception(f"[Webhook Gen/Upscale/TryOn Fal] Failed to commit changes for request {request_id}")
                 return jsonify({"error": "Database error updating records"}), 500

        elif fal_status_lower == 'failed': 
            logging.error(f"[Webhook Gen/Upscale/TryOn Fal] Received 'failed' status for request {request_id}. Payload: {data}. Marking related records as Failed.")
            
            # --- ВОЗВРАТ БАЛЛОВ --- 
            first_image = db_images[0]
            user_id_to_refund = first_image.user_id
            quantity_to_refund = len(db_images)
            original_action_type = None
            current_gen_type = first_image.generation_type
            
            if current_gen_type == GenerationType.UPSCALE:
                original_action_type = 'upscale'
                quantity_to_refund = 1 
            elif current_gen_type == GenerationType.MODEL_PHOTO:
                original_action_type = 'model_photo'
            elif current_gen_type == GenerationType.TEXT_TO_IMAGE:
                original_action_type = 'text_to_image'
            elif current_gen_type == GenerationType.TRY_ON: # Добавлено
                original_action_type = 'virtual_try_on'
            elif current_gen_type == GenerationType.NANO_BANANA:
                original_action_type = 'nano_banana'
            
            needs_refund = any(img.status != 'Failed' for img in db_images)
            
            if needs_refund and original_action_type:
                try:
                    logging.warning(f"[Webhook Gen/Upscale/TryOn Fal] Attempting to refund points for user {user_id_to_refund} for failed task (req: {request_id}, type: {original_action_type}, qty: {quantity_to_refund}).")
                    refund_action_cost(user_id_to_refund, original_action_type, quantity=quantity_to_refund, reason=f"Fal webhook status: {fal_status}")
                except Exception as refund_err:
                    logging.exception(f"[Webhook Gen/Upscale/TryOn Fal] CRITICAL: Failed to refund points for user {user_id_to_refund} after failed webhook (req: {request_id}).")
            elif not original_action_type:
                 logging.error(f"[Webhook Gen/Upscale/TryOn Fal] Cannot determine original action type for refund (req: {request_id}, type: {current_gen_type}). Refund skipped.")
            # --- КОНЕЦ ВОЗВРАТА ---

            # ... (код извлечения ошибки и обновления статуса DB записей на Failed) ...
            fal_payload = data.get("payload") # Get payload to check for error details
            error_message = data.get('error', 'Unknown failure reason') # Fal might send it in top-level 'error'
            detail_msg = None
            if isinstance(fal_payload, dict):
                 detail_list = fal_payload.get('detail')
                 if isinstance(detail_list, list) and len(detail_list) > 0 and isinstance(detail_list[0], dict):
                     detail_msg = detail_list[0].get('msg')
            
            final_error_msg = detail_msg or error_message

            updated_count = 0
            for img in db_images:
                if img.status != 'Failed':
                     img.status = 'Failed'
                     img.prompt = f"Failed: {final_error_msg[:500]}" # Store error in prompt (truncated)
                     img.updated_at = datetime.utcnow()
                     updated_count += 1
            if updated_count > 0:
                 db.session.commit()
                 logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Marked {updated_count} records as Failed for request {request_id}.")
            else:
                 logging.info(f"[Webhook Gen/Upscale/TryOn Fal] No records needed update for failed request {request_id}.")

        elif fal_status_lower in ['in_progress', 'in_queue']: 
            # ... (код обновления статуса DB на Running/In_progress) ...
            new_status = fal_status.capitalize()
            if new_status == 'In_progress': new_status = 'Running' # Normalize
            updated_count = 0
            for img in db_images:
                 if img.status == 'Pending': 
                     img.status = new_status
                     img.updated_at = datetime.utcnow()
                     updated_count += 1
            if updated_count > 0:
                 db.session.commit()
                 logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Updated {updated_count} records to '{new_status}' for request {request_id}.")
            else:
                 logging.info(f"[Webhook Gen/Upscale/TryOn Fal] No Pending records found to update status for {request_id}.")
        else:
             logging.warning(f"[Webhook Gen/Upscale/TryOn Fal] Received unknown or error status '{fal_status}' for request_id={request_id}. Marking as Failed. Payload: {data}")
             
             # --- ВОЗВРАТ БАЛЛОВ (аналогично блоку 'failed') --- 
             first_image = db_images[0]
             user_id_to_refund = first_image.user_id
             quantity_to_refund = len(db_images)
             original_action_type = None
             current_gen_type = first_image.generation_type

             if current_gen_type == GenerationType.UPSCALE:
                 original_action_type = 'upscale'
                 quantity_to_refund = 1
             elif current_gen_type == GenerationType.MODEL_PHOTO:
                 original_action_type = 'model_photo'
             elif current_gen_type == GenerationType.TEXT_TO_IMAGE:
                 original_action_type = 'text_to_image'
             elif current_gen_type == GenerationType.TRY_ON: # Добавлено
                 original_action_type = 'virtual_try_on'
             elif current_gen_type == GenerationType.NANO_BANANA:
                 original_action_type = 'nano_banana'

             needs_refund = any(img.status != 'Failed' for img in db_images)

             if needs_refund and original_action_type:
                 try:
                     logging.warning(f"[Webhook Gen/Upscale/TryOn Fal] Attempting to refund points for user {user_id_to_refund} for unknown/error status (req: {request_id}, type: {original_action_type}, qty: {quantity_to_refund}).")
                     refund_action_cost(user_id_to_refund, original_action_type, quantity=quantity_to_refund, reason=f"Fal webhook status: {fal_status}")
                 except Exception as refund_err:
                     logging.exception(f"[Webhook Gen/Upscale/TryOn Fal] CRITICAL: Failed to refund points for user {user_id_to_refund} after unknown/error webhook (req: {request_id}).")
             elif not original_action_type:
                  logging.error(f"[Webhook Gen/Upscale/TryOn Fal] Cannot determine original action type for refund (req: {request_id}, type: {current_gen_type}). Refund skipped.")
             # --- КОНЕЦ ВОЗВРАТА ---
             
             # ... (код извлечения ошибки и обновления статуса DB записей на Failed) ...
             fal_payload = data.get("payload")
             error_message = data.get('error', f'Unknown status/error: {fal_status}')
             detail_msg = None
             if isinstance(fal_payload, dict):
                 detail_list = fal_payload.get('detail')
                 if isinstance(detail_list, list) and len(detail_list) > 0 and isinstance(detail_list[0], dict):
                     detail_msg = detail_list[0].get('msg')
             final_error_msg = detail_msg or error_message

             updated_count = 0
             for img in db_images:
                 if img.status != 'Failed':
                     img.status = 'Failed'
                     img.prompt = f"Failed: {final_error_msg[:500]}" 
                     img.updated_at = datetime.utcnow()
                     updated_count += 1
             if updated_count > 0:
                 db.session.commit()
                 logging.info(f"[Webhook Gen/Upscale/TryOn Fal] Marked {updated_count} records as Failed due to status '{fal_status}'.")
             
        return jsonify({"message": "Fal webhook received successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logging.exception("[Webhook Gen/Upscale/TryOn Fal] Unexpected error processing webhook.")
        return jsonify({"error": "Internal server error"}), 500
# --- КОНЕЦ ВЕБХУКА ДЛЯ ГЕНЕРАЦИИ Fal.ai --- 

# --- NEW: Endpoint to get generation costs ---
@bp.route('/costs', methods=['GET'])
def get_costs():
    try:
        # Получаем путь к текущей директории (routes) и поднимаемся на уровень выше к backend
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        costs_file_path = os.path.join(backend_dir, 'costs_config.json')
        
        with open(costs_file_path, 'r') as f:
            costs_data = json.load(f)
        
        return jsonify(costs_data)
    except FileNotFoundError:
        logging.error("[Costs] costs_config.json not found!")
        return jsonify({"error": "Costs configuration not found"}), 500
    except Exception as e:
        logging.exception("[Costs] Error reading costs configuration")
        return jsonify({"error": "An internal error occurred"}), 500
# --- END NEW Endpoint ---

# --- NEW ROUTE FOR UPSCALE --- 
@bp.route('/upscale', methods=['POST'])
@login_required
def upscale_image():
    logging.info(f"[Upscale] Route hit by user {current_user.id}")

    # --- Проверка и списание баллов --- 
    # action_type = 'image_upscale' # Старый вариант
    action_type = 'upscale' # Используем новый ключ
    can_proceed, error_message, balance_info = check_balance_and_deduct(current_user.id, action_type)
    if not can_proceed:
        logging.warning(f"[Upscale] User {current_user.id} failed balance check for '{action_type}': {error_message}")
        response_body = {"error": error_message or "Payment required or insufficient balance."}
        if balance_info is not None:
            response_body['current_balance'] = balance_info
        return jsonify(response_body), 402 # 402 Payment Required
    
    new_balance_after_deduct = balance_info
    logging.info(f"[Upscale] User {current_user.id} passed balance check for '{action_type}'. New balance: {new_balance_after_deduct}. Proceeding.")
    # --- Конец проверки и списания --- 

    image_url_from_form = request.form.get('image_url')
    image_file_from_request = request.files.get('image') # Используем .get для безопасного доступа

    source_image_url_for_fal = None
    original_image_filename_for_log = "from_url" # Для логирования

    if image_url_from_form:
        logging.info(f"[Upscale] Using image_url from form: {image_url_from_form}")
        source_image_url_for_fal = image_url_from_form
        # Валидация URL может быть добавлена здесь, если необходимо
    elif image_file_from_request:
        logging.info(f"[Upscale] Using image file from request: {image_file_from_request.filename}")
        file = image_file_from_request # 'file' определяется здесь
        original_image_filename_for_log = file.filename

        # Весь этот блок должен быть с отступом, чтобы принадлежать 'elif image_file_from_request:'
        if file.filename == '':
            logging.warning("[Upscale] No selected file (filename is empty).")
            refund_action_cost(current_user.id, action_type, quantity=1, reason="Upscale: No selected file")
            return jsonify({"error": "No selected file"}), 400

        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            logging.warning(f"[Upscale] Invalid file type: {file.filename}")
            refund_action_cost(current_user.id, action_type, quantity=1, reason="Upscale: Invalid file type")
            return jsonify({"error": "Invalid file type. Allowed: png, jpg, jpeg, webp"}), 400

        try:
            logging.info(f"[Upscale] Uploading file {file.filename} to Fal temporary storage...")
            file_content_bytes = file.read()
            file.seek(0)
            source_image_url_for_fal = fal_client.upload(file_content_bytes, content_type=file.content_type)
            logging.info(f"[Upscale] File uploaded to Fal temp storage. Fal URL: {source_image_url_for_fal}")
        except Exception as upload_exc:
            logging.exception("[Upscale] Failed to upload file to Fal temporary storage")
            refund_action_cost(current_user.id, action_type, quantity=1, reason="Upscale: Fal temp upload failed")
            return jsonify({"error": "Failed to upload image for upscaling"}), 500

        if not source_image_url_for_fal:
            logging.error("[Upscale] Fal temporary storage upload returned no URL.")
            refund_action_cost(current_user.id, action_type, quantity=1, reason="Upscale: Fal temp upload no URL")
            return jsonify({"error": "Failed to get URL after Fal temp upload"}), 500
        # Конец блока, который должен быть с отступом
    else:
        logging.warning("[Upscale] No image_url or image file provided in the request.")
        refund_action_cost(current_user.id, action_type, quantity=1, reason="Upscale: No image source")
        return jsonify({"error": "No image_url or image file provided"}), 400

    # --- Get optional parameters --- 
    upscale_factor = request.form.get('upscale_factor', 2) # Default to 2x
    # You can add other parameters from the API docs here if needed
    # prompt = request.form.get('prompt', 'masterpiece, best quality, highres')
    # negative_prompt = request.form.get('negative_prompt', '(worst quality, low quality, normal quality:2)')
    # creativity = request.form.get('creativity', 0.35)
    # resemblance = request.form.get('resemblance', 0.6)
    # guidance_scale = request.form.get('guidance_scale', 4)
    # num_inference_steps = request.form.get('num_inference_steps', 18)
    # seed = request.form.get('seed')
    # enable_safety_checker = request.form.get('enable_safety_checker', 'true')

    try:
        upscale_factor = float(upscale_factor)
        # Add validation for other parameters if you get them
    except ValueError:
        logging.warning(f"[Upscale] Invalid upscale_factor: {upscale_factor}")
        return jsonify({"error": "Invalid upscale_factor"}), 400

    # 3. --- Call Fal.ai Clarity Upscaler (аргумент image_url будет source_image_url_for_fal)
    # Убедимся, что source_image_url_for_fal действительно установлен
    if not source_image_url_for_fal:
        logging.error("[Upscale] source_image_url_for_fal is not set before calling Fal.ai API. This should not happen.")
        # Возврат баллов
        refund_action_cost(current_user.id, action_type, quantity=1, reason="Upscale: Internal error, no source URL")
        return jsonify({"error": "Internal server error: image source URL for Fal.ai not determined."}), 500

    try:
        fal_webhook_url = None
        webhook_base_url = current_app.config.get('WEBHOOK_BASE_URL')
        if webhook_base_url:
             # Use the same webhook as generation
             fal_webhook_url = f"{webhook_base_url.rstrip('/')}/api/generation/webhook"
             logging.info(f"[Upscale] Webhook URL configured: {fal_webhook_url}")
        else:
             logging.warning("[Upscale] Webhook base URL not configured.")

        model_identifier = "fal-ai/clarity-upscaler"
        
        # --- Set Fixed Parameters based on screenshot/docs --- 
        fal_arguments = {
            # --- From Request --- 
            "image_url": source_image_url_for_fal, # Используем определенный выше URL
            "upscale_factor": upscale_factor,
            # --- Fixed Values --- 
            "prompt": "masterpiece, best quality, highres", # Default from docs
            "negative_prompt": "(worst quality, low quality, normal quality:2)",
            "creativity": 0.35,
            "resemblance": 0.6,
            "guidance_scale": 4.0, # Use float
            "num_inference_steps": 18,
            "enable_safety_checker": False, 
            # "seed": None, # Let Fal.ai handle random seed unless specified
        }
        # --- End Fixed Parameters --- 
        
        # Remove None values (if seed were added and was None)
        # No need to remove None values now as all fixed values are set
        # fal_arguments = {k: v for k, v in fal_arguments.items() if v is not None}

        logging.info(f"[Upscale] Submitting job to {model_identifier} with args: {fal_arguments}")
        handler = fal_client.submit(
            model_identifier,
            arguments=fal_arguments,
            webhook_url=fal_webhook_url
        )
        fal_request_id = handler.request_id
        logging.info(f"[Upscale] Job submitted. Fal Request ID: {fal_request_id}")

    except Exception as e_submit:
        logging.exception("[Upscale] Failed to submit job to Fal.ai")
        # --- ВОЗВРАТ БАЛЛОВ при ошибке submit --- 
        try:
            logging.warning(f"[Upscale] Attempting to refund points for user {current_user.id} due to submit failure for action '{action_type}'.")
            # action_type определен ранее как 'image_upscale', quantity=1
            refund_action_cost(current_user.id, action_type, quantity=1, reason="Fal submit failed") 
        except Exception as refund_err:
            logging.exception(f"[Upscale] CRITICAL: Failed to refund points for user {current_user.id} after submit failure.")
        # --- КОНЕЦ ВОЗВРАТА --- 
        # Attempt to delete the uploaded file if submission fails? Maybe not necessary.
        return jsonify({"error": "Failed to start upscaling job"}), 500

    # 4. --- Create DB Record (original_image_url будет source_image_url_for_fal)
    try:
        new_image = GeneratedImage(
            user_id=current_user.id,
            ai_model_id=None, 
            generation_type=GenerationType.UPSCALE, 
            original_image_url=source_image_url_for_fal, # URL исходника (либо из формы, либо загруженного на Fal)
            prompt=f"Upscale (factor: {upscale_factor}, source: {original_image_filename_for_log})", # Добавим имя файла или "from_url"
            request_id=fal_request_id,
            status='Pending',
            r2_object_key=None # Будет заполнен вебхуком
        )
        db.session.add(new_image)
        db.session.commit()
        logging.info(f"[Upscale] Started task {fal_request_id}. Created DB record ID: {new_image.id}")
        
        response_data = {
            'images': [new_image.to_dict()],
            'new_balance': new_balance_after_deduct
        }
        return jsonify(response_data), 201

    except Exception as e_commit:
        db.session.rollback()
        logging.exception(f"[Upscale] Failed to commit image record for request {fal_request_id}")
        # Attempt to refund if commit fails?
        # refund_action_cost(current_user.id, action_type, quantity=num_samples_for_fal, reason="DB commit failed for try-on")
        return jsonify({"error": "Database error saving upscale record"}), 500

# --- END NEW ROUTE FOR UPSCALE --- 

# --- NEW ROUTE FOR VIRTUAL TRY-ON --- 
@bp.route('/try-on', methods=['POST'])
@login_required
def start_try_on():
    logging.info(f"[TryOn] Route hit by user {current_user.id}")

    action_type = 'virtual_try_on'
    # Извлекаем количество изображений из формы, ключ 'num_images', по умолчанию 1
    num_images_requested = int(request.form.get('num_images', 1))
    # API Fal.ai ожидает 'num_samples', поэтому используем это имя для переменной, но значение берем из 'num_images'
    num_samples_for_fal = num_images_requested 

    if not (1 <= num_samples_for_fal <= 4): # Limit samples for cost control
        num_samples_for_fal = 1 # Если значение некорректно, ставим 1
        logging.warning(f"[TryOn] User {current_user.id} requested invalid num_images ({num_images_requested}), defaulting num_samples to 1.")

    # --- Проверка и списание баллов --- 
    can_proceed, error_message, balance_info = check_balance_and_deduct(current_user.id, action_type, quantity=num_samples_for_fal)
    if not can_proceed:
        logging.warning(f"[TryOn] User {current_user.id} failed balance check for {num_samples_for_fal}x '{action_type}': {error_message}")
        response_body = {"error": error_message or "Payment required or insufficient balance."}
        if balance_info is not None: response_body['current_balance'] = balance_info
        return jsonify(response_body), 402
    
    new_balance_after_deduct = balance_info
    logging.info(f"[TryOn] User {current_user.id} passed balance check for '{action_type}' x{num_samples_for_fal}. New balance: {new_balance_after_deduct}. Proceeding.")
    # --- Конец проверки и списания --- 

    model_image_url_from_form = request.form.get('model_image_url')
    model_file_from_request = request.files.get('model_image') # Используем .get для безопасного доступа

    # --- Check for garment_image file ---
    if 'garment_image' not in request.files:
        return jsonify({"error": "Garment_image file is required"}), 400
    
    garment_file = request.files['garment_image']
    if garment_file.filename == '':
        return jsonify({"error": "No selected file for garment image"}), 400

    # --- Determine model_image_url ---
    final_model_image_url = None
    model_filename_for_prompt = "gallery_image" # Default if URL is provided

    if model_image_url_from_form:
        logging.info(f"[TryOn] Using model_image_url directly from form: {model_image_url_from_form}")
        final_model_image_url = model_image_url_from_form
        # Попытка извлечь имя файла из URL для более информативного промпта
        try:
            parsed_url = urlparse(final_model_image_url)
            path_segments = parsed_url.path.split('/')
            if path_segments and path_segments[-1]:
                # Удаляем query параметры из имени, если они случайно попали
                model_filename_for_prompt = path_segments[-1].split('?')[0] 
        except Exception:
            logging.warning(f"[TryOn] Could not parse filename from provided model_image_url: {final_model_image_url}")
    elif model_file_from_request and model_file_from_request.filename != '':
        logging.info(f"[TryOn] Processing model_image file for Fal upload: {model_file_from_request.filename}")
        model_filename_for_prompt = model_file_from_request.filename
        try:
            model_content_bytes = model_file_from_request.read()
            model_file_from_request.seek(0) # Reset stream position after read
            # Этот URL будет URL файла, загруженного Fal.ai в свое хранилище
            final_model_image_url = fal_client.upload(model_content_bytes, content_type=model_file_from_request.content_type)
            logging.info(f"[TryOn] Model file uploaded to Fal. Fal-internal URL: {final_model_image_url}")
            if not final_model_image_url:
                raise Exception("Fal client upload returned no URL for model_image")
        except Exception as upload_exc:
            logging.exception("[TryOn] Failed to upload model_image file to Fal temporary storage")
            try: # Refund points
                refund_action_cost(current_user.id, action_type, quantity=num_samples_for_fal, reason="Fal temp upload failed for model_image in try-on")
            except Exception as refund_err:
                logging.exception(f"[TryOn] CRITICAL: Failed to refund points after model_image upload failure for user {current_user.id}.")
            return jsonify({"error": "Failed to upload model image for try-on"}), 500
    else:
        # Ни URL, ни файл модели не предоставлены
        return jsonify({"error": "Either model_image_url (form field) or model_image (file upload) is required"}), 400

    # --- Upload garment_image to Fal temporary storage ---
    # Этот блок остается, так как garment_image всегда ожидается как файл
    garment_image_url = None
    try:
        logging.info(f"[TryOn] Uploading garment file {garment_file.filename} to Fal storage...")
        garment_content_bytes = garment_file.read()
        garment_file.seek(0) # Reset stream position
        garment_image_url = fal_client.upload(garment_content_bytes, content_type=garment_file.content_type)
        logging.info(f"[TryOn] Garment file uploaded. URL: {garment_image_url}")
        if not garment_image_url:
            raise Exception("Fal client upload returned no URL for garment_image")
    except Exception as upload_exc:
        logging.exception("[TryOn] Failed to upload garment_image file to Fal temporary storage")
        try: # Refund points
            refund_action_cost(current_user.id, action_type, quantity=num_samples_for_fal, reason="Fal temp upload failed for garment_image in try-on")
        except Exception as refund_err:
            logging.exception(f"[TryOn] CRITICAL: Failed to refund points after garment_image upload failure for user {current_user.id}.")
        return jsonify({"error": "Failed to upload garment image for try-on"}), 500
    
    # --- Get optional parameters from form data --- 
    category = request.form.get('category', 'auto')
    mode = request.form.get('mode', 'balanced')
    garment_photo_type = request.form.get('garment_photo_type', 'auto')
    moderation_level = request.form.get('moderation_level', 'none')
    seed_str = request.form.get('seed', '42') # Default from docs is 42
    segmentation_free_str = request.form.get('segmentation_free', 'true') # Default from docs is true
    output_format = request.form.get('output_format', 'png') # Default from docs is png

    # --- Validate and convert parameters --- 
    try:
        seed = int(seed_str) if seed_str else 42 # Use default if empty string
        segmentation_free = segmentation_free_str.lower() == 'true'
    except ValueError:
        return jsonify({"error": "Invalid seed value"}), 400
    
    # Validate enum values
    valid_categories = ['tops', 'bottoms', 'one-pieces', 'auto']
    valid_modes = ['performance', 'balanced', 'quality']
    valid_garment_types = ['auto', 'model', 'flat-lay']
    valid_moderation = ['none', 'permissive', 'conservative']
    valid_formats = ['png', 'jpeg']

    if category not in valid_categories: category = 'auto'
    if mode not in valid_modes: mode = 'balanced'
    if garment_photo_type not in valid_garment_types: garment_photo_type = 'auto'
    if moderation_level not in valid_moderation: moderation_level = 'permissive'
    if output_format not in valid_formats: output_format = 'png'

    # --- Submit job to Fal.ai --- 
    try:
        fal_webhook_url = None
        webhook_base_url = current_app.config.get('WEBHOOK_BASE_URL')
        if webhook_base_url:
             # Use the same webhook as generation
             fal_webhook_url = f"{webhook_base_url.rstrip('/')}/api/generation/webhook"
             logging.info(f"[TryOn] Webhook URL configured: {fal_webhook_url}")
        else:
             logging.warning("[TryOn] Webhook base URL not configured.")

        model_identifier = "fal-ai/fashn/tryon/v1.5"
        fal_arguments = {
            "model_image": final_model_image_url, # Используем final_model_image_url
            "garment_image": garment_image_url,
            "category": category,
            "mode": mode,
            "garment_photo_type": garment_photo_type,
            "moderation_level": moderation_level,
            "seed": seed,
            "num_samples": num_samples_for_fal, # Используем num_samples_for_fal
            "segmentation_free": segmentation_free,
            "output_format": output_format,
        }
        
        logging.info(f"[TryOn] Submitting job to {model_identifier} with args: {fal_arguments}")
        handler = fal_client.submit(
            model_identifier,
            arguments=fal_arguments,
            webhook_url=fal_webhook_url
        )
        fal_request_id = handler.request_id
        logging.info(f"[TryOn] Job submitted. Fal Request ID: {fal_request_id}")

    except Exception as e_submit:
        logging.exception(f"[TryOn] Failed to submit job to Fal.ai: {e_submit}")
        # Refund points if submit fails
        try:
            refund_action_cost(current_user.id, action_type, quantity=num_samples_for_fal, reason="Fal submit failed for try-on")
        except Exception as refund_err:
            logging.exception(f"[TryOn] CRITICAL: Failed to refund points after submit failure for user {current_user.id}.")
        return jsonify({"error": "Failed to start try-on job"}), 500

    # --- Create DB Records --- 
    try:
        created_images = []
        # We create a DB record for each sample requested, mirroring other generations
        for i in range(num_samples_for_fal): # Используем num_samples_for_fal для цикла
             # Use filenames in prompt for reference
             prompt_text = f"Try-on: Garment '{garment_file.filename}' on Model '{model_filename_for_prompt}' (Sample {i+1}/{num_samples_for_fal})"
             new_image = GeneratedImage(
                 user_id=current_user.id,
                 ai_model_id=None, # Not tied to a specific user AIModel
                 generation_type=GenerationType.TRY_ON, 
                 original_image_url=final_model_image_url, # Store model image URL for reference
                 prompt=prompt_text, 
                 request_id=fal_request_id,
                 status='Pending',
                 r2_object_key=None # Будет заполнен вебхуком
             )
             created_images.append(new_image)

        if not created_images:
            raise ValueError("No image records created before commit")

        db.session.add_all(created_images)
        db.session.commit()
        logging.info(f"[TryOn] Started task {fal_request_id}. Created {len(created_images)} DB record(s). IDs: {[img.id for img in created_images]}")
        
        response_data = {
            'images': [img.to_dict() for img in created_images],
            'new_balance': new_balance_after_deduct
        }
        return jsonify(response_data), 201

    except Exception as e_commit:
        db.session.rollback()
        logging.exception(f"[TryOn] Failed to commit image record(s) for request {fal_request_id}: {e_commit}")
        # Attempt to refund if commit fails?
        # refund_action_cost(current_user.id, action_type, quantity=num_samples_for_fal, reason="DB commit failed for try-on")
        return jsonify({"error": "Database error saving try-on record(s)"}), 500

# --- END NEW ROUTE FOR VIRTUAL TRY-ON --- 

# --- NEW ROUTE FOR NANO BANANA (Edit multiple images using Gemini) --- 
@bp.route('/nano-banana', methods=['POST'])
@login_required
def start_nano_banana():
    logging.info(f"[NanoBanana] Route hit by user {current_user.id}")

    action_type = 'nano_banana'
    
    # Check for prompt in form data
    prompt = request.form.get('prompt')
    if not prompt:
        return jsonify({"error": "Prompt is required for nano banana editing"}), 400

    # Check for image files
    image_files = request.files.getlist('image_urls')
    if not image_files or len(image_files) == 0:
        return jsonify({"error": "At least one image file is required"}), 400

    if len(image_files) > 10:  # Limit number of images
        return jsonify({"error": "Maximum 10 images allowed"}), 400

    # Get optional parameters
    num_images = int(request.form.get('num_images', 1))
    output_format = request.form.get('output_format', 'jpeg')
    sync_mode = request.form.get('sync_mode', 'false').lower() == 'true'

    if not (1 <= num_images <= 8):
        return jsonify({"error": "Number of images must be between 1 and 8"}), 400

    # --- Balance check and deduction --- 
    can_proceed, error_message, balance_info = check_balance_and_deduct(
        current_user.id, action_type, quantity=num_images
    )
    if not can_proceed:
        logging.warning(f"[NanoBanana] User {current_user.id} failed balance check for {num_images}x '{action_type}': {error_message}")
        response_body = {"error": error_message or "Payment required or insufficient balance."}
        if balance_info is not None: 
            response_body['current_balance'] = balance_info
        return jsonify(response_body), 402
    
    new_balance_after_deduct = balance_info
    logging.info(f"[NanoBanana] User {current_user.id} passed balance check for '{action_type}' x{num_images}. New balance: {new_balance_after_deduct}. Proceeding.")

    # --- Upload images to Fal temporary storage ---
    uploaded_image_urls = []
    try:
        for i, image_file in enumerate(image_files):
            if image_file.filename == '':
                continue
            
            # Validate file type
            allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
            if '.' not in image_file.filename or image_file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
                logging.warning(f"[NanoBanana] Invalid file type: {image_file.filename}")
                refund_action_cost(current_user.id, action_type, quantity=num_images, reason="Invalid file type")
                return jsonify({"error": f"Invalid file type for {image_file.filename}. Allowed: png, jpg, jpeg, webp"}), 400

            logging.info(f"[NanoBanana] Uploading file {i+1}/{len(image_files)}: {image_file.filename}")
            file_content_bytes = image_file.read()
            image_file.seek(0)
            
            upload_url = fal_client.upload(file_content_bytes, content_type=image_file.content_type)
            if not upload_url:
                raise Exception(f"Fal client upload returned no URL for image {image_file.filename}")
            
            uploaded_image_urls.append(upload_url)
            logging.info(f"[NanoBanana] Successfully uploaded {image_file.filename} to Fal")

    except Exception as upload_exc:
        logging.exception("[NanoBanana] Failed to upload files to Fal temporary storage")
        try:
            refund_action_cost(current_user.id, action_type, quantity=num_images, reason="Fal temp upload failed")
        except Exception as refund_err:
            logging.exception(f"[NanoBanana] CRITICAL: Failed to refund points after upload failure for user {current_user.id}.")
        return jsonify({"error": "Failed to upload images for nano banana editing"}), 500

    if not uploaded_image_urls:
        return jsonify({"error": "No valid images were uploaded"}), 400

    # --- Submit job to Fal.ai --- 
    try:
        fal_webhook_url = None
        webhook_base_url = current_app.config.get('WEBHOOK_BASE_URL')
        if webhook_base_url:
            fal_webhook_url = f"{webhook_base_url.rstrip('/')}/api/generation/webhook"
            logging.info(f"[NanoBanana] Webhook URL configured: {fal_webhook_url}")
        else:
            logging.warning("[NanoBanana] Webhook base URL not configured.")

        model_identifier = "fal-ai/nano-banana/edit"
        fal_arguments = {
            "prompt": prompt,
            "image_urls": uploaded_image_urls,
            "num_images": num_images,
            "output_format": output_format,
            "sync_mode": sync_mode
        }
        
        logging.info(f"[NanoBanana] Submitting job to {model_identifier} with args: {fal_arguments}")
        handler = fal_client.submit(
            model_identifier,
            arguments=fal_arguments,
            webhook_url=fal_webhook_url
        )
        fal_request_id = handler.request_id
        logging.info(f"[NanoBanana] Job submitted. Fal Request ID: {fal_request_id}")

    except Exception as e_submit:
        logging.exception(f"[NanoBanana] Failed to submit job to Fal.ai: {e_submit}")
        try:
            refund_action_cost(current_user.id, action_type, quantity=num_images, reason="Fal submit failed for nano banana")
        except Exception as refund_err:
            logging.exception(f"[NanoBanana] CRITICAL: Failed to refund points after submit failure for user {current_user.id}.")
        return jsonify({"error": "Failed to start nano banana editing job"}), 500

    # --- Create DB Records --- 
    try:
        created_images = []
        for i in range(num_images):
            prompt_text = f"Nano Banana Edit: {prompt} (Image {i+1}/{num_images})"
            new_image = GeneratedImage(
                user_id=current_user.id,
                ai_model_id=None,
                generation_type=GenerationType.NANO_BANANA,
                prompt=prompt_text,
                request_id=fal_request_id,
                status='Pending',
                r2_object_key=None
            )
            created_images.append(new_image)

        if not created_images:
            raise ValueError("No image records created before commit")

        db.session.add_all(created_images)
        db.session.commit()
        logging.info(f"[NanoBanana] Started task {fal_request_id}. Created {len(created_images)} DB record(s). IDs: {[img.id for img in created_images]}")
        
        response_data = {
            'images': [img.to_dict() for img in created_images],
            'new_balance': new_balance_after_deduct
        }
        return jsonify(response_data), 201

    except Exception as e_commit:
        db.session.rollback()
        logging.exception(f"[NanoBanana] Failed to commit image record(s) for request {fal_request_id}: {e_commit}")
        return jsonify({"error": "Database error saving nano banana record(s)"}), 500

# --- END NEW ROUTE FOR NANO BANANA --- 

# --- Existing Webhook Handler (Needs Update) --- 