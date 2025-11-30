"""
Фабрика для создания стратегий генерации.
"""
from typing import Dict, Type
from .base import BaseGenerationStrategy


class GenerationFactory:
    """
    Фабрика для создания экземпляров стратегий генерации.
    Позволяет получить нужную стратегию по типу генерации.
    """
    
    _strategies: Dict[str, Type[BaseGenerationStrategy]] = {}
    
    @classmethod
    def register(cls, name: str, strategy_class: Type[BaseGenerationStrategy]):
        """Регистрация новой стратегии."""
        cls._strategies[name] = strategy_class
    
    @classmethod
    def get(cls, generation_type: str) -> BaseGenerationStrategy:
        """
        Получить экземпляр стратегии по типу генерации.
        
        Args:
            generation_type: Тип генерации (model_photo, text_to_image, etc.)
            
        Returns:
            Экземпляр стратегии.
            
        Raises:
            ValueError: Если тип генерации не найден.
        """
        strategy_class = cls._strategies.get(generation_type)
        if not strategy_class:
            available = ', '.join(cls._strategies.keys())
            raise ValueError(
                f"Unknown generation type: '{generation_type}'. "
                f"Available: {available}"
            )
        return strategy_class()
    
    @classmethod
    def get_available_types(cls) -> list:
        """Получить список доступных типов генерации."""
        return list(cls._strategies.keys())
    
    @classmethod
    def is_registered(cls, generation_type: str) -> bool:
        """Проверить, зарегистрирован ли тип генерации."""
        return generation_type in cls._strategies


def register_all_strategies():
    """Регистрация всех стратегий при запуске приложения."""
    from .strategies import (
        ModelPhotoStrategy,
        TextToImageStrategy,
        UpscaleStrategy,
        TryOnStrategy,
        NanoBananaStrategy,
    )
    
    GenerationFactory.register('model_photo', ModelPhotoStrategy)
    GenerationFactory.register('text_to_image', TextToImageStrategy)
    GenerationFactory.register('upscale', UpscaleStrategy)
    GenerationFactory.register('try_on', TryOnStrategy)
    GenerationFactory.register('nano_banana', NanoBananaStrategy)
