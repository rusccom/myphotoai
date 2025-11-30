"""
Стратегия апскейла изображений (Upscale).
"""
from typing import Optional
import logging
from flask import request

from ..base import BaseGenerationStrategy, GenerationConfig
from ....models import GenerationType


class UpscaleStrategy(BaseGenerationStrategy):
    """Стратегия увеличения разрешения изображений."""
    
    config = GenerationConfig(
        action_type='upscale',
        generation_type=GenerationType.UPSCALE,
        fal_model='fal-ai/clarity-upscaler',
        default_num_images=1,
        max_num_images=1,  # Апскейл всегда 1 изображение
        supports_file_upload=True,
        use_form_data=True,
    )
    
    def __init__(self):
        self.source_image_url: Optional[str] = None
        self.original_filename: str = 'from_url'
    
    def get_num_images(self, data: dict) -> int:
        """Апскейл всегда возвращает 1 изображение."""
        return 1
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных для апскейла."""
        # Проверяем наличие источника изображения
        has_url = bool(request.form.get('image_url'))
        has_file = 'image' in request.files and request.files['image'].filename
        
        if not has_url and not has_file:
            return 'Either image_url or image file is required'
        
        return None
    
    def prepare_files(self, data: dict) -> dict:
        """Подготовка изображения для апскейла."""
        # Приоритет: URL из формы, затем загруженный файл
        image_url = request.form.get('image_url')
        
        if image_url:
            self.source_image_url = image_url
            self.original_filename = 'from_url'
            logging.info(f"[Upscale] Using image_url from form: {image_url}")
            return {'urls': {'image_url': image_url}}
        
        # Загружаем файл в Fal temp storage
        file = request.files.get('image')
        if file and file.filename:
            self.original_filename = file.filename
            
            # Валидация типа файла
            allowed = {'png', 'jpg', 'jpeg', 'webp'}
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            if ext not in allowed:
                return {'error': f'Invalid file type. Allowed: {", ".join(allowed)}'}
            
            # Загружаем в Fal
            fal_url = self.upload_file_to_fal(file, file.content_type)
            if not fal_url:
                return {'error': 'Failed to upload image for upscaling'}
            
            self.source_image_url = fal_url
            logging.info(f"[Upscale] Uploaded to Fal: {fal_url}")
            return {'urls': {'image_url': fal_url}}
        
        return {'error': 'No valid image source provided'}
    
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """Построение аргументов для fal-ai/clarity-upscaler."""
        upscale_factor = 2
        try:
            upscale_factor = float(request.form.get('upscale_factor', 2))
        except (ValueError, TypeError):
            pass
        
        return {
            'image_url': file_urls.get('image_url', self.source_image_url),
            'upscale_factor': upscale_factor,
            'prompt': 'masterpiece, best quality, highres',
            'negative_prompt': '(worst quality, low quality, normal quality:2)',
            'creativity': 0.35,
            'resemblance': 0.6,
            'guidance_scale': 4.0,
            'num_inference_steps': 18,
            'enable_safety_checker': False,
        }
    
    def get_db_params(self, data: dict) -> dict:
        """Параметры для записи в БД."""
        params = super().get_db_params(data)
        params['original_image_url'] = self.source_image_url
        upscale_factor = request.form.get('upscale_factor', 2)
        params['prompt'] = f"Upscale (factor: {upscale_factor}, source: {self.original_filename})"
        return params
