"""
Базовый класс для стратегий генерации.
Реализует Template Method паттерн для унификации процесса генерации.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import logging
import fal_client
from flask import current_app, request
from flask_login import current_user

from ...models import GeneratedImage, GenerationType, db
from ...utils.costs import check_balance_and_deduct, refund_action_cost


@dataclass
class GenerationConfig:
    """Конфигурация для типа генерации"""
    action_type: str                    # Ключ из costs_config.json
    generation_type: GenerationType     # Enum тип для БД
    fal_model: str                      # Идентификатор модели Fal.ai
    default_num_images: int = 1
    max_num_images: int = 8
    supports_file_upload: bool = False
    use_form_data: bool = False         # True если данные в FormData


@dataclass
class GenerationResult:
    """Результат выполнения генерации"""
    success: bool
    images: List[dict] = field(default_factory=list)
    new_balance: Optional[int] = None
    error: Optional[str] = None
    status_code: int = 200


class BaseGenerationStrategy(ABC):
    """
    Базовый класс для всех стратегий генерации.
    Использует Template Method паттерн.
    """
    
    config: GenerationConfig  # Определяется в наследниках
    
    def execute(self, data: dict) -> GenerationResult:
        """
        Template Method - основной алгоритм генерации.
        Вызывает методы в определенном порядке, некоторые можно переопределить.
        """
        num_images = 0
        
        try:
            # 1. Валидация входных данных
            validation_error = self.validate_input(data)
            if validation_error:
                logging.warning(f"[{self.config.action_type}] Validation failed: {validation_error}")
                return GenerationResult(
                    success=False, 
                    error=validation_error, 
                    status_code=400
                )
            
            # 2. Получение количества изображений
            num_images = self.get_num_images(data)
            
            # 3. Проверка и списание баланса
            balance_result = self._check_and_deduct_balance(num_images)
            if not balance_result['success']:
                return GenerationResult(
                    success=False,
                    error=balance_result['error'],
                    new_balance=balance_result.get('current_balance'),
                    status_code=402
                )
            
            new_balance = balance_result['new_balance']
            logging.info(f"[{self.config.action_type}] Balance check passed. New balance: {new_balance}")
            
            # 4. Подготовка файлов (если стратегия поддерживает)
            file_urls = {}
            if self.config.supports_file_upload:
                file_result = self.prepare_files(data)
                if file_result.get('error'):
                    self._refund(num_images, f"File upload failed: {file_result['error']}")
                    return GenerationResult(
                        success=False, 
                        error=file_result['error'], 
                        status_code=400
                    )
                file_urls = file_result.get('urls', {})
            
            # 5. Построение аргументов для Fal.ai
            fal_arguments = self.build_fal_arguments(data, file_urls)
            logging.info(f"[{self.config.action_type}] Fal arguments built: {fal_arguments}")
            
            # 6. Отправка в Fal.ai
            request_id = self._submit_to_fal(fal_arguments)
            logging.info(f"[{self.config.action_type}] Submitted to Fal.ai. Request ID: {request_id}")
            
            # 7. Создание записей в БД
            images = self._create_db_records(data, request_id, num_images)
            logging.info(f"[{self.config.action_type}] Created {len(images)} DB records")
            
            return GenerationResult(
                success=True,
                images=images,
                new_balance=new_balance,
                status_code=201
            )
            
        except Exception as e:
            logging.exception(f"[{self.config.action_type}] Error during generation: {e}")
            if num_images > 0:
                self._refund(num_images, str(e)[:100])
            return GenerationResult(
                success=False, 
                error=f"Internal error: {str(e)}", 
                status_code=500
            )
    
    # === Абстрактные методы (ОБЯЗАТЕЛЬНО переопределить) ===
    
    @abstractmethod
    def validate_input(self, data: dict) -> Optional[str]:
        """
        Валидация входных данных.
        Returns: Сообщение об ошибке или None если всё OK.
        """
        pass
    
    @abstractmethod
    def build_fal_arguments(self, data: dict, file_urls: dict) -> dict:
        """
        Построение аргументов для Fal.ai API.
        Returns: Словарь аргументов для fal_client.submit()
        """
        pass
    
    # === Переопределяемые методы (опционально) ===
    
    def get_num_images(self, data: dict) -> int:
        """Получение количества изображений из данных."""
        num = data.get('num_images', self.config.default_num_images)
        try:
            num = int(num)
        except (ValueError, TypeError):
            num = self.config.default_num_images
        return min(max(1, num), self.config.max_num_images)
    
    def prepare_files(self, data: dict) -> dict:
        """
        Подготовка и загрузка файлов в Fal temp storage.
        Returns: {'urls': {...}} или {'error': '...'}
        """
        return {'urls': {}}
    
    def get_db_params(self, data: dict) -> dict:
        """Параметры для сохранения в GeneratedImage."""
        return {
            'prompt': data.get('prompt'),
            'style': data.get('style'),
            'camera_angle': data.get('cameraAngle'),
            'emotion': data.get('emotion'),
            'aspect_ratio': data.get('aspectRatio', '1:1'),
            'ai_model_id': None,
            'model_url': None,
            'original_image_url': None,
        }
    
    def get_extra_image_fields(self, data: dict) -> dict:
        """Дополнительные поля для GeneratedImage (переопределяется)."""
        return {}
    
    # === Приватные методы (общая логика) ===
    
    def _check_and_deduct_balance(self, num_images: int) -> dict:
        """Проверка и списание баланса."""
        can_proceed, error_msg, balance = check_balance_and_deduct(
            current_user.id,
            self.config.action_type,
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
        """Отправка задания в Fal.ai."""
        webhook_url = self._get_webhook_url()
        
        # Убираем None значения
        fal_arguments = {k: v for k, v in fal_arguments.items() if v is not None}
        
        handler = fal_client.submit(
            self.config.fal_model,
            arguments=fal_arguments,
            webhook_url=webhook_url
        )
        return handler.request_id
    
    def _get_webhook_url(self) -> Optional[str]:
        """Получение URL вебхука."""
        base = current_app.config.get('WEBHOOK_BASE_URL')
        if base:
            return f"{base.rstrip('/')}/api/generation/webhook"
        logging.warning(f"[{self.config.action_type}] Webhook base URL not configured")
        return None
    
    def _create_db_records(self, data: dict, request_id: str, num_images: int) -> List[dict]:
        """Создание записей GeneratedImage в БД."""
        params = self.get_db_params(data)
        extra_fields = self.get_extra_image_fields(data)
        images = []
        
        for _ in range(num_images):
            image = GeneratedImage(
                user_id=current_user.id,
                generation_type=self.config.generation_type,
                request_id=request_id,
                status='Pending',
                ai_model_id=params.get('ai_model_id'),
                prompt=params.get('prompt'),
                style=params.get('style'),
                camera_angle=params.get('camera_angle'),
                emotion=params.get('emotion'),
                model_url=params.get('model_url'),
                original_image_url=params.get('original_image_url'),
                **extra_fields
            )
            db.session.add(image)
            images.append(image)
        
        db.session.commit()
        
        # Формируем ответ с aspectRatio
        aspect_ratio = params.get('aspect_ratio', '1:1')
        return [
            {**img.to_dict(), 'aspectRatio': aspect_ratio}
            for img in images
        ]
    
    def _refund(self, num_images: int, reason: str):
        """Возврат поинтов при ошибке."""
        try:
            logging.warning(f"[{self.config.action_type}] Refunding {num_images} actions. Reason: {reason}")
            refund_action_cost(
                current_user.id,
                self.config.action_type,
                quantity=num_images,
                reason=reason
            )
        except Exception as e:
            logging.exception(f"[{self.config.action_type}] Failed to refund: {e}")
    
    # === Вспомогательные методы для стратегий ===
    
    def upload_file_to_fal(self, file_obj, content_type: str = None) -> Optional[str]:
        """
        Загрузка файла в Fal.ai temporary storage.
        Returns: URL загруженного файла или None при ошибке.
        """
        try:
            content = file_obj.read()
            file_obj.seek(0)
            url = fal_client.upload(content, content_type=content_type)
            return url
        except Exception as e:
            logging.error(f"[{self.config.action_type}] Failed to upload to Fal: {e}")
            return None
