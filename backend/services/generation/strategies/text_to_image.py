"""
Стратегия базовой генерации Text-to-Image.
"""
from typing import Optional

from ..base import BaseGenerationStrategy, GenerationConfig
from ....models import GenerationType


class TextToImageStrategy(BaseGenerationStrategy):
    """Стратегия базовой генерации изображений по текстовому описанию."""
    
    config = GenerationConfig(
        action_type='text_to_image',
        generation_type=GenerationType.TEXT_TO_IMAGE,
        fal_model='fal-ai/flux-pro/v1.1-ultra',
        default_num_images=1,
        max_num_images=8,
        supports_file_upload=False,
        use_form_data=False,
    )
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных для text-to-image."""
        if not data.get('prompt', '').strip():
            return 'Prompt is required'
        
        # aiModelId не должен быть передан для базовой генерации
        if data.get('aiModelId'):
            return 'aiModelId should not be provided for text-to-image. Use model_photo type instead.'
        
        return None
    
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """Построение аргументов для fal-ai/flux-pro."""
        return {
            'prompt': data.get('prompt', '').strip(),
            'aspect_ratio': data.get('aspectRatio', '16:9'),
            'num_images': self.get_num_images(data),
            'output_format': data.get('output_format', 'jpeg'),
            'seed': data.get('seed'),
            'enable_safety_checker': False,
            'safety_tolerance': data.get('safety_tolerance', '6'),
            'raw': data.get('raw', False),
        }
