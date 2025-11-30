"""
Стратегия виртуальной примерки одежды (Virtual Try-On).
Использует fal-ai/flux-2-lora-gallery/virtual-tryon.
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
        fal_model='fal-ai/flux-2-lora-gallery/virtual-tryon',
        default_num_images=1,
        max_num_images=4,
        supports_file_upload=True,
        use_form_data=True,
    )
    
    # Допустимые значения параметров
    VALID_IMAGE_SIZES = [
        'square_hd', 'square', 'portrait_4_3', 'portrait_16_9',
        'landscape_4_3', 'landscape_16_9'
    ]
    VALID_FORMATS = ['png', 'jpeg', 'webp']
    
    def __init__(self):
        self.model_image_url: Optional[str] = None
        self.garment_image_url: Optional[str] = None
        self.model_filename: str = 'gallery_image'
        self.garment_filename: str = 'garment'
    
    def get_num_images(self, data: dict) -> int:
        """Получение количества изображений."""
        num = int(request.form.get('num_images', 1))
        return min(max(1, num), self.config.max_num_images)
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных для примерки."""
        if 'garment_image' not in request.files:
            return 'garment_image file is required'
        
        garment = request.files['garment_image']
        if not garment.filename:
            return 'No selected file for garment image'
        
        has_model_url = bool(request.form.get('model_image_url'))
        has_model_file = 'model_image' in request.files and request.files['model_image'].filename
        
        if not has_model_url and not has_model_file:
            return 'Either model_image_url or model_image file is required'
        
        return None
    
    def prepare_files(self, data: dict) -> dict:
        """Подготовка изображений для примерки."""
        model_url = request.form.get('model_image_url')
        
        if model_url:
            self.model_image_url = model_url
            try:
                path = urlparse(model_url).path
                self.model_filename = path.split('/')[-1].split('?')[0] or 'gallery_image'
            except Exception:
                pass
            logging.info(f"[TryOn] Using model_image_url: {model_url}")
        else:
            model_file = request.files.get('model_image')
            if model_file and model_file.filename:
                self.model_filename = model_file.filename
                fal_url = self.upload_file_to_fal(model_file, model_file.content_type)
                if not fal_url:
                    return {'error': 'Failed to upload model image'}
                self.model_image_url = fal_url
                logging.info(f"[TryOn] Uploaded model image to Fal: {fal_url}")
        
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
        """Построение аргументов для fal-ai/flux-2-lora-gallery/virtual-tryon."""
        model_url = file_urls.get('model_image', self.model_image_url)
        garment_url = file_urls.get('garment_image', self.garment_image_url)
        
        # Prompt (обязательный параметр)
        prompt = request.form.get('prompt', '').strip()
        if not prompt:
            prompt = "Virtual Try On"
        
        # Image size (None = использует размер входного изображения)
        image_size = request.form.get('image_size')
        if image_size and image_size not in self.VALID_IMAGE_SIZES:
            image_size = None
        
        # Output format
        output_format = request.form.get('output_format', 'png')
        if output_format not in self.VALID_FORMATS:
            output_format = 'png'
        
        # Numeric parameters
        guidance_scale = self._get_float_param('guidance_scale', 2.5, 1.0, 10.0)
        num_inference_steps = self._get_int_param('num_inference_steps', 40, 10, 100)
        lora_scale = self._get_float_param('lora_scale', 1.0, 0.0, 2.0)
        
        # Seed (optional)
        seed = None
        seed_str = request.form.get('seed')
        if seed_str:
            try:
                seed = int(seed_str)
            except (ValueError, TypeError):
                pass
        
        args = {
            'image_urls': [model_url, garment_url],
            'prompt': prompt,
            'guidance_scale': guidance_scale,
            'num_inference_steps': num_inference_steps,
            'acceleration': 'none',  # Максимальное качество
            'seed': seed,
            'enable_safety_checker': False,  # Выключен
            'output_format': output_format,
            'num_images': self.get_num_images(data),
            'lora_scale': lora_scale,
        }
        
        # Image size только если указан (иначе API использует размер входного фото)
        if image_size:
            args['image_size'] = image_size
        
        return args
    
    def _get_float_param(self, name: str, default: float, min_v: float, max_v: float) -> float:
        """Безопасное получение float параметра."""
        try:
            val = float(request.form.get(name, default))
            return min(max(min_v, val), max_v)
        except (ValueError, TypeError):
            return default
    
    def _get_int_param(self, name: str, default: int, min_v: int, max_v: int) -> int:
        """Безопасное получение int параметра."""
        try:
            val = int(request.form.get(name, default))
            return min(max(min_v, val), max_v)
        except (ValueError, TypeError):
            return default
    
    def get_db_params(self, data: dict) -> dict:
        """Параметры для записи в БД."""
        params = super().get_db_params(data)
        params['original_image_url'] = self.model_image_url
        prompt = request.form.get('prompt', '').strip()
        if not prompt:
            prompt = "Virtual Try On"
        params['prompt'] = prompt
        return params
