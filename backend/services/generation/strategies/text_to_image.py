"""
Стратегия базовой генерации Text-to-Image (Flux 2 Pro).
"""
from typing import Optional

from ..base import BaseGenerationStrategy, GenerationConfig
from ....models import GenerationType


# Маппинг aspect ratio → image_size для Flux 2 Pro
ASPECT_RATIO_TO_IMAGE_SIZE = {
    '3:4': 'portrait_4_3',
    '9:16': 'portrait_16_9',
    '1:1': 'square',
    '4:3': 'landscape_4_3',
    '16:9': 'landscape_16_9',
}


class TextToImageStrategy(BaseGenerationStrategy):
    """Стратегия базовой генерации изображений по текстовому описанию."""
    
    config = GenerationConfig(
        action_type='text_to_image',
        generation_type=GenerationType.TEXT_TO_IMAGE,
        fal_model='fal-ai/flux-2-pro',
        default_num_images=1,
        max_num_images=1,
        supports_file_upload=False,
        use_form_data=False,
    )
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных для text-to-image."""
        if not data.get('prompt', '').strip():
            return 'Prompt is required'
        
        if data.get('aiModelId'):
            return 'aiModelId should not be provided for text-to-image.'
        
        return None
    
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """Построение аргументов для fal-ai/flux-2-pro."""
        aspect_ratio = data.get('aspectRatio', '3:4')
        image_size = ASPECT_RATIO_TO_IMAGE_SIZE.get(aspect_ratio, 'portrait_4_3')
        
        return {
            'prompt': data.get('prompt', '').strip(),
            'image_size': image_size,
            'output_format': data.get('output_format', 'jpeg'),
            'seed': data.get('seed'),
            'enable_safety_checker': False,
            'safety_tolerance': '5',
        }
