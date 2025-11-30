"""
Стратегия виртуальной примерки одежды (Virtual Try-On).
"""
from typing import Optional
import logging
from urllib.parse import urlparse
from flask import request

from ..base import BaseGenerationStrategy, GenerationConfig
from ....models import GenerationType


class TryOnStrategy(BaseGenerationStrategy):
    """Стратегия виртуальной примерки одежды с помощью AI."""
    
    config = GenerationConfig(
        action_type='virtual_try_on',
        generation_type=GenerationType.TRY_ON,
        fal_model='fal-ai/fashn/tryon/v1.5',
        default_num_images=1,
        max_num_images=4,
        supports_file_upload=True,
        use_form_data=True,
    )
    
    # Допустимые значения параметров
    VALID_CATEGORIES = ['tops', 'bottoms', 'one-pieces', 'auto']
    VALID_MODES = ['performance', 'balanced', 'quality']
    VALID_GARMENT_TYPES = ['auto', 'model', 'flat-lay']
    VALID_MODERATION = ['none', 'permissive', 'conservative']
    VALID_FORMATS = ['png', 'jpeg']
    
    def __init__(self):
        self.model_image_url: Optional[str] = None
        self.garment_image_url: Optional[str] = None
        self.model_filename: str = 'gallery_image'
        self.garment_filename: str = 'garment'
    
    def get_num_images(self, data: dict) -> int:
        """Получение количества изображений (num_samples)."""
        num = int(request.form.get('num_images', 1))
        return min(max(1, num), self.config.max_num_images)
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных для примерки."""
        # Проверяем garment_image (обязательно файл)
        if 'garment_image' not in request.files:
            return 'garment_image file is required'
        
        garment = request.files['garment_image']
        if not garment.filename:
            return 'No selected file for garment image'
        
        # Проверяем model_image (URL или файл)
        has_model_url = bool(request.form.get('model_image_url'))
        has_model_file = 'model_image' in request.files and request.files['model_image'].filename
        
        if not has_model_url and not has_model_file:
            return 'Either model_image_url or model_image file is required'
        
        return None
    
    def prepare_files(self, data: dict) -> dict:
        """Подготовка изображений для примерки."""
        # 1. Model image
        model_url = request.form.get('model_image_url')
        
        if model_url:
            self.model_image_url = model_url
            # Извлекаем имя файла из URL
            try:
                path = urlparse(model_url).path
                self.model_filename = path.split('/')[-1].split('?')[0] or 'gallery_image'
            except Exception:
                pass
            logging.info(f"[TryOn] Using model_image_url: {model_url}")
        else:
            # Загружаем model_image файл
            model_file = request.files.get('model_image')
            if model_file and model_file.filename:
                self.model_filename = model_file.filename
                fal_url = self.upload_file_to_fal(model_file, model_file.content_type)
                if not fal_url:
                    return {'error': 'Failed to upload model image'}
                self.model_image_url = fal_url
                logging.info(f"[TryOn] Uploaded model image to Fal: {fal_url}")
        
        # 2. Garment image (всегда файл)
        garment_file = request.files['garment_image']
        self.garment_filename = garment_file.filename
        
        garment_url = self.upload_file_to_fal(garment_file, garment_file.content_type)
        if not garment_url:
            return {'error': 'Failed to upload garment image'}
        
        self.garment_image_url = garment_url
        logging.info(f"[TryOn] Uploaded garment image to Fal: {garment_url}")
        
        return {
            'urls': {
                'model_image': self.model_image_url,
                'garment_image': self.garment_image_url,
            }
        }
    
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """Построение аргументов для fal-ai/fashn/tryon."""
        # Валидация и нормализация параметров
        category = request.form.get('category', 'auto')
        if category not in self.VALID_CATEGORIES:
            category = 'auto'
        
        mode = request.form.get('mode', 'balanced')
        if mode not in self.VALID_MODES:
            mode = 'balanced'
        
        garment_type = request.form.get('garment_photo_type', 'auto')
        if garment_type not in self.VALID_GARMENT_TYPES:
            garment_type = 'auto'
        
        moderation = request.form.get('moderation_level', 'permissive')
        if moderation not in self.VALID_MODERATION:
            moderation = 'permissive'
        
        output_format = request.form.get('output_format', 'png')
        if output_format not in self.VALID_FORMATS:
            output_format = 'png'
        
        # Seed
        seed = 42
        try:
            seed = int(request.form.get('seed', 42))
        except (ValueError, TypeError):
            pass
        
        # Segmentation free
        seg_free = request.form.get('segmentation_free', 'true').lower() == 'true'
        
        return {
            'model_image': file_urls.get('model_image', self.model_image_url),
            'garment_image': file_urls.get('garment_image', self.garment_image_url),
            'category': category,
            'mode': mode,
            'garment_photo_type': garment_type,
            'moderation_level': moderation,
            'seed': seed,
            'num_samples': self.get_num_images(data),
            'segmentation_free': seg_free,
            'output_format': output_format,
        }
    
    def get_db_params(self, data: dict) -> dict:
        """Параметры для записи в БД."""
        params = super().get_db_params(data)
        params['original_image_url'] = self.model_image_url
        num_samples = self.get_num_images(data)
        params['prompt'] = f"Try-on: Garment '{self.garment_filename}' on Model '{self.model_filename}'"
        return params
