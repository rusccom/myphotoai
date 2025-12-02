"""
Стратегия редактирования изображений Edit Photo.
Поддерживает две модели: Nano Banana Pro и Flux 2 Pro.
"""
from typing import Optional, List
import logging
from flask import request
import fal_client

from ..base import BaseGenerationStrategy, GenerationConfig
from ....models import GenerationType
from ....utils.costs import check_balance_and_deduct


# Маппинг aspect ratio → image_size для Flux 2 Pro
ASPECT_RATIO_TO_IMAGE_SIZE = {
    '3:4': 'portrait_4_3',
    '9:16': 'portrait_16_9',
    '1:1': 'square',
    '4:3': 'landscape_4_3',
    '16:9': 'landscape_16_9',
}

# Конфигурация моделей
EDIT_MODELS = {
    'nano_banana_pro': {
        'fal_model': 'fal-ai/nano-banana-pro/edit',
        'action_type': 'edit_photo_nano_banana',
        'max_num_images': 4,
    },
    'flux_2_pro': {
        'fal_model': 'fal-ai/flux-2-pro/edit',
        'action_type': 'edit_photo_flux',
        'max_num_images': 1,
    }
}

VALID_ASPECT_RATIOS = ['3:4', '9:16', '1:1', '4:3', '16:9']


class EditPhotoStrategy(BaseGenerationStrategy):
    """Стратегия редактирования изображений с выбором модели."""
    
    config = GenerationConfig(
        action_type='edit_photo_nano_banana',  # Default, переопределяется
        generation_type=GenerationType.EDIT_PHOTO,
        fal_model='fal-ai/nano-banana-pro/edit',  # Default, переопределяется
        default_num_images=1,
        max_num_images=4,
        supports_file_upload=True,
        use_form_data=True,
    )
    
    MAX_INPUT_IMAGES = 10
    
    def __init__(self):
        self.uploaded_image_urls: List[str] = []
        self.selected_model = 'nano_banana_pro'
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных."""
        # Проверяем выбранную модель
        model = request.form.get('model', 'nano_banana_pro')
        if model not in EDIT_MODELS:
            return f'Invalid model. Must be one of: {", ".join(EDIT_MODELS.keys())}'
        self.selected_model = model
        
        # Проверяем промпт
        prompt = request.form.get('prompt', '').strip()
        if not prompt:
            return 'Prompt is required for photo editing'
        
        # Проверяем наличие изображений (URL из галереи ИЛИ загруженные файлы)
        has_url = bool(request.form.get('image_url'))
        image_files = request.files.getlist('image_urls')
        has_files = image_files and len(image_files) > 0 and image_files[0].filename
        
        if not has_url and not has_files:
            return 'At least one image file or image_url is required'
        
        if has_files and len(image_files) > self.MAX_INPUT_IMAGES:
            return f'Maximum {self.MAX_INPUT_IMAGES} images allowed'
        
        # Проверяем aspect_ratio если передан
        aspect_ratio = request.form.get('aspect_ratio')
        if aspect_ratio and aspect_ratio not in VALID_ASPECT_RATIOS:
            return f'Invalid aspect_ratio. Must be one of: {", ".join(VALID_ASPECT_RATIOS)}'
        
        return None
    
    def prepare_files(self, data: dict) -> dict:
        """Загрузка изображений в Fal temp storage или использование URL из галереи."""
        # Проверяем сначала URL из галереи
        image_url = request.form.get('image_url')
        if image_url:
            logging.info(f"[EditPhoto] Using image_url from gallery: {image_url[:50]}...")
            self.uploaded_image_urls = [image_url]
            return {'urls': {'image_urls': self.uploaded_image_urls}}
        
        # Иначе загружаем файлы
        image_files = request.files.getlist('image_urls')
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        
        self.uploaded_image_urls = []
        
        for i, image_file in enumerate(image_files):
            if not image_file.filename:
                continue
            
            ext = image_file.filename.rsplit('.', 1)[-1].lower() if '.' in image_file.filename else ''
            if ext not in allowed_extensions:
                return {'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'}
            
            logging.info(f"[EditPhoto] Uploading file {i+1}/{len(image_files)}")
            fal_url = self.upload_file_to_fal(image_file, image_file.content_type)
            
            if not fal_url:
                return {'error': f'Failed to upload image {image_file.filename}'}
            
            self.uploaded_image_urls.append(fal_url)
        
        if not self.uploaded_image_urls:
            return {'error': 'No valid images were uploaded'}
        
        return {'urls': {'image_urls': self.uploaded_image_urls}}
    
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """Построение аргументов в зависимости от выбранной модели."""
        image_urls = file_urls.get('image_urls', self.uploaded_image_urls)
        prompt = request.form.get('prompt', '').strip()
        aspect_ratio = request.form.get('aspect_ratio', '')
        
        if self.selected_model == 'nano_banana_pro':
            return self._build_nano_banana_args(prompt, image_urls, aspect_ratio)
        else:
            return self._build_flux_args(prompt, image_urls, aspect_ratio)
    
    def _build_nano_banana_args(self, prompt: str, image_urls: List[str], aspect_ratio: str) -> dict:
        """Аргументы для Nano Banana Pro."""
        args = {
            'prompt': prompt,
            'image_urls': image_urls,
            'num_images': self.get_num_images({}),
            'output_format': 'jpeg',
            'resolution': '1K',
        }
        
        if aspect_ratio:
            args['aspect_ratio'] = aspect_ratio
        
        return args
    
    def _build_flux_args(self, prompt: str, image_urls: List[str], aspect_ratio: str) -> dict:
        """Аргументы для Flux 2 Pro."""
        args = {
            'prompt': prompt,
            'image_urls': image_urls,
            'output_format': 'jpeg',
            'safety_tolerance': '5',
            'enable_safety_checker': False,
        }
        
        if aspect_ratio:
            image_size = ASPECT_RATIO_TO_IMAGE_SIZE.get(aspect_ratio, 'auto')
            args['image_size'] = image_size
        
        return args
    
    def get_num_images(self, data: dict) -> int:
        """Получение количества выходных изображений."""
        model_config = EDIT_MODELS.get(self.selected_model, {})
        max_images = model_config.get('max_num_images', 1)
        
        try:
            num = int(request.form.get('num_images', 1))
            return min(max(1, num), max_images)
        except (ValueError, TypeError):
            return 1
    
    def get_db_params(self, data: dict) -> dict:
        """Параметры для записи в БД."""
        params = super().get_db_params(data)
        prompt = request.form.get('prompt', '').strip()
        model_label = 'Nano Banana' if self.selected_model == 'nano_banana_pro' else 'Flux 2'
        params['prompt'] = f"Edit Photo ({model_label}): {prompt}"
        return params
    
    def _get_action_type(self) -> str:
        """Получение action_type для выбранной модели."""
        return EDIT_MODELS.get(self.selected_model, {}).get('action_type', 'edit_photo_nano_banana')
    
    def _get_fal_model(self) -> str:
        """Получение fal_model для выбранной модели."""
        return EDIT_MODELS.get(self.selected_model, {}).get('fal_model', 'fal-ai/nano-banana-pro/edit')
    
    def _check_and_deduct_balance(self, num_images: int) -> dict:
        """Проверка и списание баланса с учетом выбранной модели."""
        from flask_login import current_user
        
        action_type = self._get_action_type()
        can_proceed, error_msg, balance = check_balance_and_deduct(
            current_user.id,
            action_type,
            quantity=num_images
        )
        
        if can_proceed:
            return {'success': True, 'new_balance': balance}
        else:
            return {
                'success': False,
                'error': error_msg or 'Insufficient balance',
                'current_balance': balance
            }
    
    def _submit_to_fal(self, fal_arguments: dict) -> str:
        """Отправка задания в Fal.ai с динамическим выбором модели."""
        from flask import current_app
        
        webhook_url = self._get_webhook_url()
        fal_model = self._get_fal_model()
        
        fal_arguments = {k: v for k, v in fal_arguments.items() if v is not None}
        
        logging.info(f"[EditPhoto] Submitting to {fal_model}")
        
        handler = fal_client.submit(
            fal_model,
            arguments=fal_arguments,
            webhook_url=webhook_url
        )
        return handler.request_id
