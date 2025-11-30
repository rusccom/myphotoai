"""
Generation Routes - Тонкий контроллер для всех типов генерации.
Использует стратегии из services/generation/.
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import logging
import os
import json
from datetime import datetime

from ..app import db
from ..models import GeneratedImage, GenerationType
from ..services.generation import GenerationFactory
from ..services.generation.factory import register_all_strategies
from ..utils.image_utils import download_and_upload_to_r2
from ..utils.costs import refund_action_cost

bp = Blueprint('generation', __name__)

# Регистрируем все стратегии при импорте модуля
register_all_strategies()


@bp.route('/start', methods=['POST'])
@login_required
def start_generation():
    """
    Универсальный endpoint для запуска генерации любого типа.
    
    Типы генерации (параметр 'type'):
    - model_photo: Генерация с LoRA моделью
    - text_to_image: Базовая text-to-image генерация
    - upscale: Увеличение разрешения
    - try_on: Виртуальная примерка
    - nano_banana: Редактирование изображений (Gemini)
    """
    # Определяем тип данных и извлекаем параметры
    if request.is_json:
        data = request.get_json() or {}
        generation_type = data.get('type')
    else:
        data = request.form.to_dict()
        generation_type = request.form.get('type')
    
    # Валидация типа генерации
    if not generation_type:
        return jsonify({
            'error': 'Generation type is required. Pass "type" parameter.',
            'available_types': GenerationFactory.get_available_types()
        }), 400
    
    # Получаем стратегию
    try:
        strategy = GenerationFactory.get(generation_type)
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'available_types': GenerationFactory.get_available_types()
        }), 400
    
    logging.info(f"[Generation] User {current_user.id} starting '{generation_type}'")
    
    # Выполняем генерацию через стратегию
    result = strategy.execute(data)
    
    # Формируем ответ
    response = {}
    if result.success:
        response['images'] = result.images
        response['new_balance'] = result.new_balance
    else:
        response['error'] = result.error
        if result.new_balance is not None:
            response['current_balance'] = result.new_balance
    
    return jsonify(response), result.status_code


@bp.route('/history', methods=['GET'])
@login_required
def get_generation_history():
    """Получение истории генераций пользователя с пагинацией."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated = GeneratedImage.query.filter_by(
        user_id=current_user.id
    ).order_by(
        GeneratedImage.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'images': [img.to_dict() for img in paginated.items],
        'has_next': paginated.has_next,
        'next_page': paginated.next_num,
        'total_pages': paginated.pages,
        'current_page': paginated.page
    }), 200


@bp.route('/costs', methods=['GET'])
def get_costs():
    """Получение конфигурации стоимости операций."""
    try:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        costs_file = os.path.join(backend_dir, 'costs_config.json')
        
        with open(costs_file, 'r') as f:
            costs_data = json.load(f)
        
        return jsonify(costs_data)
    except FileNotFoundError:
        logging.error("[Costs] costs_config.json not found!")
        return jsonify({'error': 'Costs configuration not found'}), 500
    except Exception as e:
        logging.exception("[Costs] Error reading costs configuration")
        return jsonify({'error': 'Internal error'}), 500


@bp.route('/webhook', methods=['POST'])
def handle_fal_webhook():
    """Универсальный webhook для обработки результатов от Fal.ai."""
    logging.info("[Webhook] Received request from Fal.ai")
    
    try:
        data = request.get_json()
        if not data:
            logging.warning("[Webhook] Empty or invalid JSON payload")
            return jsonify({'error': 'Invalid payload'}), 400
        
        logging.info(f"[Webhook] Payload: {data}")
        
        request_id = data.get('request_id')
        fal_status = data.get('status')
        
        if not request_id or not fal_status:
            logging.warning(f"[Webhook] Missing required fields: {data}")
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Находим записи в БД
        db_images = GeneratedImage.query.filter_by(
            request_id=request_id
        ).order_by(GeneratedImage.id).all()
        
        if not db_images:
            logging.error(f"[Webhook] No records found for request_id: {request_id}")
            return jsonify({'message': 'Record not found, ignored'}), 200
        
        fal_status_lower = fal_status.lower()
        generation_type = db_images[0].generation_type
        
        if fal_status_lower in ['completed', 'ok']:
            _handle_completed(data, db_images, generation_type)
        elif fal_status_lower == 'failed':
            _handle_failed(data, db_images, generation_type, fal_status)
        elif fal_status_lower in ['in_progress', 'in_queue']:
            _handle_in_progress(db_images)
        else:
            logging.warning(f"[Webhook] Unknown status: {fal_status}")
            _handle_failed(data, db_images, generation_type, fal_status)
        
        return jsonify({'message': 'Webhook processed'}), 200
        
    except Exception as e:
        db.session.rollback()
        logging.exception(f"[Webhook] Error processing webhook: {e}")
        return jsonify({'error': 'Internal error'}), 500


def _handle_completed(data: dict, db_images: list, generation_type):
    """Обработка успешного завершения генерации."""
    payload = data.get('payload')
    
    if not isinstance(payload, dict):
        logging.error("[Webhook] Invalid payload format")
        _mark_all_failed(db_images, "Invalid payload format")
        return
    
    # Извлекаем изображения в зависимости от типа
    if generation_type == GenerationType.UPSCALE:
        image_data = payload.get('image')
        result_images = [image_data] if isinstance(image_data, dict) else []
    else:
        result_images = payload.get('images', [])
        if not isinstance(result_images, list):
            result_images = []
    
    if not result_images:
        logging.error("[Webhook] No images in payload")
        _mark_all_failed(db_images, "No images in response")
        return
    
    logging.info(f"[Webhook] Processing {len(result_images)} images")
    
    for i in range(min(len(db_images), len(result_images))):
        db_record = db_images[i]
        fal_result = result_images[i]
        
        if db_record.status in ['Ready', 'Failed']:
            continue
        
        if not isinstance(fal_result, dict):
            db_record.status = 'Failed'
            db_record.updated_at = datetime.utcnow()
            continue
        
        image_url = fal_result.get('url')
        if not image_url:
            db_record.status = 'Failed'
            db_record.updated_at = datetime.utcnow()
            continue
        
        db_record.download_url = image_url
        entity_type = db_record.generation_type.value
        
        try:
            r2_key = download_and_upload_to_r2(
                image_url, db_record.user_id, db_record.id, entity_type=entity_type
            )
        except Exception as e:
            logging.exception(f"[Webhook] R2 upload error: {e}")
            r2_key = None
        
        if r2_key:
            db_record.r2_object_key = r2_key
            db_record.status = 'Ready'
            db_record.is_downloaded = True
            if fal_result.get('width'):
                db_record.width = fal_result['width']
            if fal_result.get('height'):
                db_record.height = fal_result['height']
            logging.info(f"[Webhook] Image {db_record.id} uploaded to R2")
        else:
            db_record.status = 'Failed'
            db_record.is_downloaded = False
        
        db_record.updated_at = datetime.utcnow()
    
    # Помечаем лишние записи как Failed
    for i in range(len(result_images), len(db_images)):
        if db_images[i].status == 'Pending':
            db_images[i].status = 'Failed'
            db_images[i].updated_at = datetime.utcnow()
    
    db.session.commit()
    _emit_websocket_updates(db_images)


def _handle_failed(data: dict, db_images: list, generation_type, status: str):
    """Обработка ошибки генерации."""
    first_image = db_images[0]
    user_id = first_image.user_id
    quantity = len(db_images)
    
    action_type_map = {
        GenerationType.MODEL_PHOTO: 'model_photo',
        GenerationType.TEXT_TO_IMAGE: 'text_to_image',
        GenerationType.UPSCALE: 'upscale',
        GenerationType.TRY_ON: 'virtual_try_on',
        GenerationType.NANO_BANANA: 'nano_banana',
    }
    action_type = action_type_map.get(generation_type)
    
    if generation_type == GenerationType.UPSCALE:
        quantity = 1
    
    needs_refund = any(img.status != 'Failed' for img in db_images)
    
    if needs_refund and action_type:
        try:
            refund_action_cost(user_id, action_type, quantity=quantity, reason=f"Fal status: {status}")
            logging.info(f"[Webhook] Refunded {quantity}x {action_type} for user {user_id}")
        except Exception as e:
            logging.exception(f"[Webhook] Failed to refund: {e}")
    
    error_msg = data.get('error', f'Status: {status}')
    payload = data.get('payload')
    if isinstance(payload, dict):
        detail = payload.get('detail')
        if isinstance(detail, list) and detail and isinstance(detail[0], dict):
            error_msg = detail[0].get('msg', error_msg)
    
    _mark_all_failed(db_images, error_msg)
    _emit_websocket_updates(db_images)


def _handle_in_progress(db_images: list):
    """Обработка статуса "в процессе"."""
    for img in db_images:
        if img.status == 'Pending':
            img.status = 'Running'
            img.updated_at = datetime.utcnow()
    db.session.commit()
    logging.info(f"[Webhook] Updated {len(db_images)} records to Running")


def _mark_all_failed(db_images: list, error_msg: str):
    """Пометить все записи как Failed."""
    for img in db_images:
        if img.status != 'Failed':
            img.status = 'Failed'
            img.prompt = f"Failed: {error_msg[:500]}"
            img.updated_at = datetime.utcnow()
    db.session.commit()


def _emit_websocket_updates(db_images: list):
    """Отправка WebSocket уведомлений."""
    try:
        from ..app import socketio
        for img in db_images:
            if img.status in ['Ready', 'Failed']:
                room = f"user_{img.user_id}"
                socketio.emit('image_updated', img.to_dict(), room=room)
                logging.info(f"[WebSocket] Sent update for image {img.id}")
    except Exception as e:
        logging.warning(f"[WebSocket] Could not emit: {e}")
