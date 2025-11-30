"""
Стратегия генерации с LoRA моделью (Model Photo).
"""
from typing import Optional
import logging
from flask_login import current_user

from ..base import BaseGenerationStrategy, GenerationConfig
from ....models import GenerationType, AIModel, ModelStatus


class ModelPhotoStrategy(BaseGenerationStrategy):
    """Стратегия генерации изображений с использованием LoRA модели."""
    
    config = GenerationConfig(
        action_type='model_photo',
        generation_type=GenerationType.MODEL_PHOTO,
        fal_model='fal-ai/flux-lora',
        default_num_images=1,
        max_num_images=8,
        supports_file_upload=False,
        use_form_data=False,
    )
    
    # Маппинг aspectRatio в image_size для Fal.ai
    ASPECT_RATIO_MAP = {
        '1:1': 'square_hd',
        '3:4': 'portrait_4_3',
        '4:3': 'landscape_4_3',
        '9:16': 'portrait_16_9',
        '16:9': 'landscape_16_9',
    }
    
    # Маппинги параметров в промпт-фразы
    STYLE_MAP = {
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
        'Pop Art': 'pop art style, vibrant colors, comic book look, Andy Warhol inspired',
    }
    
    CAMERA_MAP = {
        'Close-up': 'close-up portrait shot',
        'Medium shot': 'medium shot, waist up',
        'Full shot': 'full body shot, full view',
        'From above': 'shot from above, high angle view',
        'From below': 'shot from below, low angle view',
    }
    
    EMOTION_MAP = {
        'Smiling': 'smiling face, happy expression',
        'Serious': 'serious expression, neutral face',
        'Happy': 'joyful expression, genuinely happy',
        'Sad': 'sad expression, melancholic mood',
        'Confident': 'confident expression, self-assured look',
        'Neutral': 'neutral expression',
        'Scared': 'scared expression, frightened look',
    }
    
    LIGHT_MAP = {
        'Studio Light': 'professional studio lighting, softbox, high key',
        'Ring Light': 'ring light photography, circular catchlights in eyes',
        'Neon Light': 'neon lighting, cyberpunk aesthetic, vibrant glowing colors',
        'Dramatic Shadow': 'dramatic shadows, hard light, chiaroscuro',
    }
    
    def __init__(self):
        self.ai_model: Optional[AIModel] = None
    
    def validate_input(self, data: dict) -> Optional[str]:
        """Валидация входных данных для LoRA генерации."""
        if not data.get('prompt', '').strip():
            return 'Prompt is required'
        
        ai_model_id = data.get('aiModelId')
        if not ai_model_id:
            return 'aiModelId is required for model photo generation'
        
        # Проверяем существование и доступность модели
        self.ai_model = AIModel.query.filter_by(
            id=ai_model_id,
            user_id=current_user.id
        ).first()
        
        if not self.ai_model:
            return 'AI Model not found or access denied'
        
        if self.ai_model.status != ModelStatus.READY:
            return f'AI Model is not ready. Current status: {self.ai_model.status.value}'
        
        if not self.ai_model.model_url:
            return 'LoRA URL is missing for this model'
        
        return None
    
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """Построение аргументов для fal-ai/flux-lora."""
        # Построение сложного промпта
        final_prompt = self._build_prompt(data)
        
        # Маппинг aspectRatio в image_size
        aspect_ratio = data.get('aspectRatio', '1:1')
        image_size = self.ASPECT_RATIO_MAP.get(aspect_ratio, 'landscape_4_3')
        
        # LoRA scale
        lora_scale = 1.0
        finetune_strength = data.get('finetuneStrength')
        if finetune_strength is not None:
            try:
                lora_scale = float(finetune_strength)
                lora_scale = max(0.0, min(2.0, lora_scale))
            except (ValueError, TypeError):
                pass
        
        return {
            'prompt': final_prompt,
            'image_size': image_size,
            'num_images': self.get_num_images(data),
            'output_format': data.get('output_format', 'jpeg'),
            'seed': data.get('seed'),
            'enable_safety_checker': False,
            'loras': [{'path': self.ai_model.model_url, 'scale': lora_scale}],
            'num_inference_steps': data.get('num_inference_steps', 28),
            'guidance_scale': data.get('guidance_scale', 3.5),
        }
    
    def _build_prompt(self, data: dict) -> str:
        """Построение комплексного промпта с учетом параметров модели."""
        parts = []
        
        # Trigger word модели
        if self.ai_model.trigger_word:
            parts.append(self.ai_model.trigger_word)
        
        # Основной промпт пользователя
        user_prompt = data.get('prompt', '').strip()
        if user_prompt:
            parts.append(user_prompt)
        
        # Характеристики персоны из модели
        person_details = []
        if self.ai_model.age:
            person_details.append(f"{self.ai_model.age} year old")
        if self.ai_model.gender:
            person_details.append(str(self.ai_model.gender).strip())
        if self.ai_model.eye_color:
            eye_color = str(self.ai_model.eye_color).strip()
            if person_details:
                person_details.append(f"with {eye_color} eyes")
            else:
                person_details.append(f"{eye_color} eyes")
        
        if person_details:
            parts.append(' '.join(person_details))
        
        if self.ai_model.appearance:
            parts.append(str(self.ai_model.appearance).strip())
        
        # Эмоция
        emotion = data.get('emotion')
        if emotion and emotion in self.EMOTION_MAP:
            parts.append(self.EMOTION_MAP[emotion])
        
        # Ракурс камеры
        camera = data.get('cameraAngle')
        if camera and camera in self.CAMERA_MAP:
            parts.append(self.CAMERA_MAP[camera])
        
        # Освещение
        light = data.get('light')
        if light and light in self.LIGHT_MAP:
            parts.append(self.LIGHT_MAP[light])
        
        # Стиль
        style = data.get('style')
        if style and style in self.STYLE_MAP:
            parts.append(self.STYLE_MAP[style])
        
        final_prompt = ', '.join(filter(None, parts))
        logging.info(f"[ModelPhoto] Built prompt: {final_prompt}")
        
        return final_prompt
    
    def get_db_params(self, data: dict) -> dict:
        """Параметры для записи в БД."""
        params = super().get_db_params(data)
        params['ai_model_id'] = self.ai_model.id
        params['model_url'] = self.ai_model.model_url
        # Сохраняем оригинальный промпт пользователя
        params['prompt'] = data.get('prompt', '').strip()
        return params
