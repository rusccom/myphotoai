"""
Стратегия редактирования изображений Nano Banana (Gemini AI).
"""
from typing import Optional, List
import logging
from flask import request

from ..base import BaseGenerationStrategy, GenerationConfig
from ....models import GenerationType


class NanoBananaStrategy(BaseGenerationStrategy):
    """Стратегия редактирования нескольких изображений с помощью AI."""
    
    config = GenerationConfig(
        action_type='nano_banana',
        generation_type=GenerationType.NANO_BANANA,
        fal_model='fal-ai/nano-banana/edit',
        default_num_images=1,
        max_num_images=8,
        supports_file_upload=True,
        use_form_data=True,
    )
    
    # Допустимые aspect ratios
    VALID_ASPECT_RATIOS = [
        '21:9', '1:1', '4:3', '3:2', '2:3', 
        '5:4', '4:5', '3:4', '16:9', '9:16'
    ]
    
    MAX_INPUT_IMAGES = 10
    
    def __init__(self):
        self.uploaded_image_urls: List[str] = []
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных для Nano Banana."""
        # Проверяем промпт
        prompt = request.form.get('prompt', '').strip()
        if not prompt:
            return 'Prompt is required for nano banana editing'
        
        # Проверяем наличие файлов
        image_files = request.files.getlist('image_urls')
        if not image_files or len(image_files) == 0:
            return 'At least one image file is required'
        
        if len(image_files) > self.MAX_INPUT_IMAGES:
            return f'Maximum {self.MAX_INPUT_IMAGES} images allowed'
        
        # Проверяем aspect_ratio если передан
        aspect_ratio = request.form.get('aspect_ratio')
        if aspect_ratio and aspect_ratio not in self.VALID_ASPECT_RATIOS:
            return f'Invalid aspect_ratio. Must be one of: {", ".join(self.VALID_ASPECT_RATIOS)}'
        
        return None
    
    def prepare_files(self, data: dict) -> dict:
        """Загрузка всех изображений в Fal temp storage."""
        image_files = request.files.getlist('image_urls')
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        
        for i, image_file in enumerate(image_files):
            if not image_file.filename:
                continue
            
            # Валидация типа файла
            ext = image_file.filename.rsplit('.', 1)[-1].lower() if '.' in image_file.filename else ''
            if ext not in allowed_extensions:
                return {'error': f'Invalid file type for {image_file.filename}. Allowed: {", ".join(allowed_extensions)}'}
            
            # Загружаем в Fal
            logging.info(f"[NanoBanana] Uploading file {i+1}/{len(image_files)}: {image_file.filename}")
            fal_url = self.upload_file_to_fal(image_file, image_file.content_type)
            
            if not fal_url:
                return {'error': f'Failed to upload image {image_file.filename}'}
            
            self.uploaded_image_urls.append(fal_url)
            logging.info(f"[NanoBanana] Successfully uploaded: {image_file.filename}")
        
        if not self.uploaded_image_urls:
            return {'error': 'No valid images were uploaded'}
        
        return {'urls': {'image_urls': self.uploaded_image_urls}}
    
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """Построение аргументов для fal-ai/nano-banana/edit."""
        args = {
            'prompt': request.form.get('prompt', '').strip(),
            'image_urls': file_urls.get('image_urls', self.uploaded_image_urls),
            'num_images': self.get_num_images(data),
            'output_format': request.form.get('output_format', 'jpeg'),
            'sync_mode': request.form.get('sync_mode', 'false').lower() == 'true',
        }
        
        # Добавляем aspect_ratio только если передан
        aspect_ratio = request.form.get('aspect_ratio')
        if aspect_ratio:
            args['aspect_ratio'] = aspect_ratio
        
        return args
    
    def get_num_images(self, data: dict) -> int:
        """Получение количества выходных изображений."""
        try:
            num = int(request.form.get('num_images', 1))
            return min(max(1, num), self.config.max_num_images)
        except (ValueError, TypeError):
            return self.config.default_num_images
    
    def get_db_params(self, data: dict) -> dict:
        """Параметры для записи в БД."""
        params = super().get_db_params(data)
        prompt = request.form.get('prompt', '').strip()
        params['prompt'] = f"Nano Banana Edit: {prompt}"
        return params
