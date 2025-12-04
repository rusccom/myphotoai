from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
import os
import tempfile
import zipfile # Для создания ZIP
import shutil  # Для удаления папки, если понадобится временная
import logging # Импортируем logging
import uuid # Добавляем импорт uuid
import random # Добавляем импорт random
import string # Добавляем импорт string
import fal_client # <--- Добавить этот импорт в начало файла model.py
from datetime import datetime
from io import BytesIO # Для передачи файла превью в R2

from ..app import db
from ..models import User, AIModel, ModelStatus # Импортируем AIModel, ModelStatus
from ..utils.costs import check_balance_and_deduct, refund_action_cost # <--- Добавляем refund_action_cost
# Импортируем утилиты для R2
from ..utils.r2_utils import upload_file_to_r2

bp = Blueprint('model', __name__)

# TODO: Настроить разрешенные расширения и папку для загрузок
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILES = 30 # Максимальное количество файлов
MIN_FILES = 1  

# Конфигурация типов моделей для разных Fal.ai trainer-ов
MODEL_CONFIGS = {
    'flux2': {
        'endpoint': 'fal-ai/flux-2-trainer',
        'zip_param': 'image_data_url',
        'trigger_param': 'default_caption',
        'extra_args': {
            'steps': 1000,
            'learning_rate': 0.00005,
            'output_lora_format': 'fal',
        }
    },
    'flux': {
        'endpoint': 'fal-ai/flux-lora-portrait-trainer',
        'zip_param': 'images_data_url',
        'trigger_param': 'trigger_phrase',
        'extra_args': {
            'steps': 2500,
            'learning_rate': 0.00009,
            'multiresolution_training': True,
            'subject_crop': True,
            'create_masks': False,
        }
    }
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/create', methods=['POST'])
@login_required
def create_model():
    logging.info(f"[CreateModel-Fal] Route hit by user {current_user.id}.")
    action_type = 'model_training'

    # --- Проверка и списание баллов ---
    can_proceed, error_message, balance_info = check_balance_and_deduct(current_user.id, action_type)
    if not can_proceed:
        logging.warning(f"[CreateModel-Fal] User {current_user.id} failed balance check for '{action_type}': {error_message}")
        return jsonify({"error": error_message or "Payment required or insufficient balance."}), 402
    logging.info(f"[CreateModel-Fal] User {current_user.id} passed balance check for '{action_type}'. New balance: {balance_info}. Proceeding.")

    # --- Получение данных --- 
    model_type = request.form.get('modelType', 'flux2')
    config = MODEL_CONFIGS.get(model_type, MODEL_CONFIGS['flux2'])
    logging.info(f"[CreateModel-Fal] Model type: {model_type}, endpoint: {config['endpoint']}")
    
    gender = request.form.get('gender')
    age_str = request.form.get('age')
    eye_color = request.form.get('eyeColor')
    appearance = request.form.get('appearance')
    model_name_base = request.form.get('modelName', f"My Model")
    files = request.files.getlist('photos')

    # --- Валидация --- 
    if not all([gender, age_str, eye_color, appearance]):
         return jsonify({"error": "Missing user description parameters"}), 400
    try:
        age = int(age_str)
        if not 0 <= age <= 150: raise ValueError("Age out of range")
    except ValueError:
        return jsonify({"error": "Invalid age parameter"}), 400
    if not files or len(files) < MIN_FILES or len(files) > MAX_FILES:
         return jsonify({"error": f"Please upload between {MIN_FILES} and {MAX_FILES} photos."}), 400
    valid_files = [f for f in files if f and allowed_file(f.filename)]
    if len(valid_files) < MIN_FILES:
        return jsonify({"error": f"At least {MIN_FILES} valid photos ({', '.join(ALLOWED_EXTENSIONS)}) are required."}), 400

    # --- Генерируем trigger_word / trigger_phrase --- 
    generated_trigger_word = ''.join(random.choices(string.ascii_lowercase, k=10))
    logging.info(f"[CreateModel-Fal] Generated trigger word/phrase: {generated_trigger_word}")

    count = AIModel.query.filter_by(user_id=current_user.id).count()
    model_name = f"{model_name_base} #{count + 1}"

    new_model_db = None
    model_creation_uuid = str(uuid.uuid4())
    preview_r2_key = None
    zip_path_final = None 

    try: # Основной try для всей функции
        new_model_db = AIModel(
            user_id=current_user.id,
            name=model_name,
            creation_uuid=model_creation_uuid,
            trigger_word=generated_trigger_word,
            status=ModelStatus.TRAINING,
            preview_r2_object_key=None, 
            gender=gender,
            age=age,
            eye_color=eye_color,
            appearance=appearance,
            concept_type=model_type
        )
        db.session.add(new_model_db)
        db.session.flush() 
        model_id = new_model_db.id
        if not model_id:
            logging.error("[CreateModel-Fal] Failed to get model ID after session flush.")
            raise ValueError("Failed to get model ID after session flush.")
        logging.info(f"[CreateModel-Fal] Flushed AIModel ID: {model_id}, UUID: {model_creation_uuid}")

        # --- Сохранение превью в R2 --- 
        if valid_files: 
            first_file = valid_files[0] 
            file_extension = first_file.filename.rsplit('.', 1)[1].lower()
            preview_r2_object_key_temp = f"users/{current_user.id}/model_previews/{model_id}_{str(uuid.uuid4())}.{file_extension}"
            try: 
                first_file.seek(0)
                file_bytes_for_preview = BytesIO(first_file.read())
                first_file.seek(0) 

                if upload_file_to_r2(file_obj=file_bytes_for_preview, 
                                       object_key=preview_r2_object_key_temp, 
                                       content_type=first_file.content_type):
                    preview_r2_key = preview_r2_object_key_temp
                    new_model_db.preview_r2_object_key = preview_r2_key 
                    logging.info(f"[CreateModel-Fal] Saved preview image to R2 with key: {preview_r2_key}")
                else:
                    logging.error(f"[CreateModel-Fal] Failed to save preview image to R2 for model {model_id}")
            except Exception as e_save_preview_inner:
                logging.exception(f"[CreateModel-Fal] Exception during preview image R2 upload for model {model_id}: {e_save_preview_inner}")
        else:
            logging.warning("[CreateModel-Fal] No valid files provided for preview image (valid_files is empty).")

        # --- Создание ZIP-архива и логика Fal.ai --- 
        try: 
            with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
                zip_path_final = tmp_zip.name
            
            logging.info(f"[CreateModel-Fal] Creating final zip in temporary file: {zip_path_final}")
            with zipfile.ZipFile(zip_path_final, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_to_zip in valid_files:
                    filename = secure_filename(file_to_zip.filename)
                    file_to_zip.seek(0) 
                    file_bytes = file_to_zip.read()
                    zipf.writestr(filename, file_bytes)
                    file_to_zip.seek(0) 
            logging.info(f"[CreateModel-Fal] Final zip created successfully at {zip_path_final}.")

            logging.info(f"[CreateModel-Fal] Uploading ZIP file to Fal: {zip_path_final}")
            zip_url_from_fal = fal_client.upload_file(zip_path_final)
            logging.info(f"[CreateModel-Fal] ZIP uploaded to Fal, URL: {zip_url_from_fal}")
            
            fal_webhook_url = None
            webhook_base_url = current_app.config.get('WEBHOOK_BASE_URL') 
            if webhook_base_url:
                 fal_webhook_url = f"{webhook_base_url.rstrip('/')}/api/model/webhook" 
                 logging.info(f"[CreateModel-Fal] Webhook URL configured: {fal_webhook_url}")
            else:
                 logging.warning("[CreateModel-Fal] Webhook base URL not configured.")

            fal_arguments = {
                config['zip_param']: zip_url_from_fal,
                config['trigger_param']: generated_trigger_word,
                **config['extra_args']
            }
            
            model_identifier = config['endpoint']
            logging.info(f"[CreateModel-Fal] Submitting training job to {model_identifier} with args: {fal_arguments}")
            handler = fal_client.submit(
                model_identifier,
                arguments=fal_arguments,
                webhook_url=fal_webhook_url
            )
            fal_request_id = handler.request_id
            logging.info(f"[CreateModel-Fal] Training job submitted. Fal Request ID: {fal_request_id}")
            
            new_model_db.request_id = fal_request_id
            db.session.commit()
            logging.info(f"[CreateModel-Fal] Successfully committed model {model_id}. Request ID: {fal_request_id}, Preview R2 Key: {preview_r2_key}")
            return jsonify(new_model_db.to_dict()), 201

        except Exception as e_zip_or_fal: 
            logging.exception(f"[CreateModel-Fal] Error during ZIP/Fal.ai processing for model {model_id}. Error: {e_zip_or_fal}")
            db.session.rollback() 
            if new_model_db and new_model_db.id: 
                try:
                    model_to_fail = db.session.get(AIModel, new_model_db.id)
                    if model_to_fail:
                        model_to_fail.status = ModelStatus.FAILED
                        model_to_fail.updated_at = datetime.utcnow()
                        db.session.commit()
                        logging.info(f"[CreateModel-Fal] Marked model {model_to_fail.id} as FAILED due to ZIP/Fal.ai error.")
                except Exception as e_fail_update:
                    logging.error(f"[CreateModel-Fal] Could not mark model as FAILED after ZIP/Fal error: {e_fail_update}")
                    db.session.rollback() 

            try:
                logging.warning(f"[CreateModel-Fal] Attempting to refund points for user {current_user.id} due to ZIP/Fal.ai failure for action '{action_type}'.")
                refund_action_cost(current_user.id, action_type, quantity=1, reason="Fal model training prep/submit failed")
            except Exception as refund_err:
                logging.exception(f"[CreateModel-Fal] CRITICAL: Failed to refund points for user {current_user.id} after ZIP/Fal.ai failure.")
            return jsonify({"error": "Failed to prepare training data or initiate training."}), 500
        finally: 
            if zip_path_final and os.path.exists(zip_path_final):
                try:
                    os.remove(zip_path_final)
                    logging.info(f"[CreateModel-Fal] Deleted temporary ZIP file: {zip_path_final}")
                except OSError as e_remove_zip:
                    logging.error(f"[CreateModel-Fal] Error deleting temporary ZIP file {zip_path_final}: {e_remove_zip}")
    
    except Exception as e_outer: 
        db.session.rollback()
        logging.exception(f"[CreateModel-Fal] Outer error during model creation for UUID {model_creation_uuid}: {e_outer}")
        if new_model_db and new_model_db.id:
             try:
                model_to_fail_outer = db.session.get(AIModel, new_model_db.id)
                if model_to_fail_outer and model_to_fail_outer.status != ModelStatus.FAILED : 
                    model_to_fail_outer.status = ModelStatus.FAILED
                    model_to_fail_outer.updated_at = datetime.utcnow()
                    db.session.commit()
                    logging.info(f"[CreateModel-Fal] Marked model {model_to_fail_outer.id} as FAILED due to outer error.")
             except Exception as e_fail_outer_update:
                logging.error(f"[CreateModel-Fal] Could not mark model as FAILED after outer error: {e_fail_outer_update}")
                db.session.rollback()

        try:
            logging.warning(f"[CreateModel-Fal] Attempting to refund points for user {current_user.id} due to outer error for action '{action_type}'.")
            refund_action_cost(current_user.id, action_type, quantity=1, reason="Outer model creation error before Fal prep")
        except Exception as refund_err:
            logging.exception(f"[CreateModel-Fal] CRITICAL: Failed to refund points for user {current_user.id} after outer error.")
        return jsonify({"error": "An internal error occurred during model creation initialization"}), 500

# --- МАРШРУТ ДЛЯ ВЕБХУКОВ МОДЕЛИ --- 
@bp.route('/webhook', methods=['POST'])
def handle_model_webhook():
    logging.info("[Webhook Model Fal] Received request.")
    # TODO: Добавить проверку секрета/подписи, если Fal.ai ее предоставляет
    
    try:
        data = request.get_json()
        if not data:
            logging.warning("[Webhook Model Fal] Request body is not JSON or empty.")
            return jsonify({"error": "Invalid payload"}), 400

        logging.info(f"[Webhook Model Fal] Payload received: {data}")

        # Извлекаем request_id и status (адаптировать под реальный формат Fal.ai)
        request_id = data.get("request_id") # Fal.ai может использовать другой ключ?
        fal_status = data.get("status")

        if not request_id or not fal_status:
            logging.warning(f"[Webhook Model Fal] Missing 'request_id' or 'status' in payload: {data}")
            return jsonify({"error": "Missing required fields"}), 400

        # Ищем модель по ID запроса
        ai_model = AIModel.query.filter_by(request_id=request_id).first()

        if not ai_model:
            logging.error(f"[Webhook Model Fal] Could not find local model with request ID '{request_id}'. Webhook ignored.")
            return jsonify({"message": "Local model not found for this request ID, webhook ignored."}), 200

        # --- Обработка статуса и результата --- 
        model_updated = False
        new_status_enum = None
        old_status_enum = ai_model.status
        model_lora_url = None 
        
        status_lower = fal_status.lower()
        
        # Добавляем 'ok' как один из успешных статусов
        if status_lower == 'completed' or status_lower == 'ok': 
            result_data = data.get("result") # Fal.ai для обучения моделей может использовать "result" или напрямую "payload"
            if not result_data: # Проверяем, есть ли "result", если нет, может быть в "payload"
                result_data = data.get("payload")

            if isinstance(result_data, dict):
                lora_file_info = result_data.get("diffusers_lora_file")
                if isinstance(lora_file_info, dict):
                    model_lora_url = lora_file_info.get("url")
            
            if not model_lora_url:
                logging.error(f"[Webhook Model Fal] Status is '{fal_status}' for request {request_id}, but no LoRA URL (result/payload.diffusers_lora_file.url) found.")
                new_status_enum = ModelStatus.FAILED
            else:
                new_status_enum = ModelStatus.READY
                ai_model.model_url = model_lora_url 
                logging.info(f"[Webhook Model Fal] Model {ai_model.id} is Ready. LoRA URL saved: {model_lora_url}.")
        elif status_lower == 'failed': 
            new_status_enum = ModelStatus.FAILED
            logging.error(f"[Webhook Model Fal] Received 'failed' status for request {request_id}. Payload: {data}")
            # --- ВОЗВРАТ БАЛЛОВ --- 
            if ai_model.status != ModelStatus.FAILED: # Возвращаем только если статус реально меняется на FAILED
                try:
                    logging.warning(f"[Webhook Model Fal] Attempting to refund points for user {ai_model.user_id} for failed model training (req: {request_id}).")
                    refund_action_cost(ai_model.user_id, 'model_training', quantity=1, reason=f"Fal webhook status: {fal_status}")
                except Exception as refund_err:
                    logging.exception(f"[Webhook Model Fal] CRITICAL: Failed to refund points for user {ai_model.user_id} after failed training webhook (req: {request_id}).")
            # --- КОНЕЦ ВОЗВРАТА ---
        elif status_lower == 'training': 
             new_status_enum = ModelStatus.TRAINING
        else:
            logging.warning(f"[Webhook Model Fal] Unknown status '{fal_status}' received for request_id={request_id}. Treating as potential issue, but not changing status unless explicit failure.")
            # Не меняем статус на FAILED автоматически, если статус просто неизвестен, 
            # т.к. это может быть новый промежуточный статус от Fal.ai
            # Оставляем текущий статус модели, если new_status_enum не установлен.

        # Обновляем статус в БД, если он изменился
        if new_status_enum and new_status_enum != old_status_enum:
            logging.info(f"[Webhook Model Fal] Updating status for model {ai_model.id} (Req ID: {request_id}) from {old_status_enum.name} to {new_status_enum.name}")
            ai_model.status = new_status_enum
            model_updated = True
        elif new_status_enum:
             logging.info(f"[Webhook Model Fal] Status '{fal_status}' received, but model {ai_model.id} is already {new_status_enum.name}. No DB update needed.")

        # Коммитим изменения, если они были (статус или URL модели)
        if model_updated or (new_status_enum == ModelStatus.READY and model_lora_url is not None):
            ai_model.updated_at = datetime.utcnow()
            db.session.commit()
            logging.info(f"[Webhook Model Fal] Model {ai_model.id} updated successfully.")
        else:
            logging.info(f"[Webhook Model Fal] No database changes required for model {ai_model.id}.")

        return jsonify({"message": "Webhook received successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logging.exception("[Webhook Model Fal] Unexpected error processing webhook.")
        return jsonify({"error": "Internal server error"}), 500
# --- КОНЕЦ МАРШРУТА ДЛЯ ВЕБХУКА МОДЕЛИ --- 

# Маршрут для получения списка моделей пользователя
@bp.route('/list', methods=['GET'])
@login_required
def list_models():
    models = AIModel.query.filter_by(user_id=current_user.id).order_by(AIModel.created_at.desc()).all()
    return jsonify([model.to_dict() for model in models]), 200

# Маршруты синхронизации и удаления убраны/закомментированы ранее
# @bp.route('/sync', methods=['POST'])
# @login_required
# def sync_models():
#    ... (весь код sync_models удален) ...

# Маршрут для удаления модели (опционально)
# @bp.route('/delete/<int:model_id>', methods=['DELETE'])
# @login_required
# def delete_model(model_id):
#     model = AIModel.query.filter_by(id=model_id, user_id=current_user.id).first_or_404()
#     # TODO: Возможно, нужно сначала отменить задачу в BFL API, если она еще не завершена?
#     db.session.delete(model)
#     db.session.commit()
#     return jsonify({"message": "Model deleted successfully"}), 200 