from flask import current_app
import requests
import logging
import os
import shutil
import uuid
from io import BytesIO

from .r2_utils import upload_file_to_r2

def download_and_upload_to_r2(image_url: str, user_id: int, image_db_id: int, entity_type: str = 'photo'):
    """
    Скачивает изображение по URL и загружает его в R2.
    Возвращает ключ объекта R2 в случае успеха, иначе None.
    entity_type: 'photo' для обычных генераций, 'model_preview' для превью моделей.
    """
    logging.info(f"[R2 Upload] Starting download from {image_url} for user {user_id}, db_id {image_db_id}, type {entity_type}")

    try:
        response = requests.get(image_url, stream=True, timeout=60)
        response.raise_for_status()

        content_type = response.headers.get('content-type')
        file_extension = 'jpg'
        if content_type:
            if 'image/jpeg' in content_type:
                file_extension = 'jpg'
            elif 'image/png' in content_type:
                file_extension = 'png'
            elif 'image/webp' in content_type:
                file_extension = 'webp'
            logging.info(f"[R2 Upload] Detected Content-Type: {content_type}, using extension: {file_extension}")
        else:
            content_type = 'application/octet-stream'
            logging.warning(f"[R2 Upload] Content-Type not found in headers for {image_url}. Using fallback {content_type}")

        unique_id = str(uuid.uuid4())
        
        if entity_type == 'model_preview':
            object_key = f"users/{user_id}/model_previews/{image_db_id}_{unique_id}.{file_extension}"
        else:
            # Все остальные типы генераций сохраняем как фотографии
            object_key = f"users/{user_id}/photos/{image_db_id}_{unique_id}.{file_extension}"

        logging.info(f"[R2 Upload] Generated R2 object key: {object_key}")

        image_bytes = BytesIO(response.content)
        
        if upload_file_to_r2(file_obj=image_bytes, object_key=object_key, content_type=content_type):
            logging.info(f"[R2 Upload] Successfully downloaded from {image_url} and uploaded to R2 as {object_key}")
            return object_key
        else:
            logging.error(f"[R2 Upload] Failed to upload to R2 for {object_key}.")
        return None

    except requests.exceptions.RequestException as e:
        logging.error(f"[R2 Upload] Failed to download {image_url}: {e}")
        return None
    except Exception as e:
        logging.exception(f"[R2 Upload] An unexpected error occurred: {e}")
    return None 

# def download_and_save_image(image_url, user_id, image_db_id):
#     # 1. Формирование путей:
#     instance_path = current_app.instance_path
#     uploads_folder_name = current_app.config.get('USER_UPLOADS_FOLDER', 'user_uploads')
#     base_uploads_folder = os.path.join(instance_path, uploads_folder_name)
#     user_folder = os.path.join(base_uploads_folder, str(user_id))
#     user_photos_folder = os.path.join(user_folder, 'photos')
#     
#     logging.info(f"[Download Image] Calculated Paths: instance='{instance_path}', uploads='{base_uploads_folder}', user_folder='{user_folder}', photos_folder='{user_photos_folder}'")
#     
#     # Проверка и создание папки пользователя и папки photos
#     try:
#         os.makedirs(user_photos_folder, exist_ok=True)
#     except OSError as e:
#         logging.exception(f"[Download Image] Failed to create directory {user_photos_folder}")
#         return None
#
#     # Определяем расширение файла (пока предполагаем jpeg)
#     # TODO: Определять расширение из ответа BFL или заголовков Content-Type
#     file_extension = 'jpg'
#     local_filename = f"{image_db_id}.{file_extension}"
#     local_filepath = os.path.join(user_photos_folder, local_filename)
#     relative_url = f"/uploads/{user_id}/photos/{local_filename}"
#
#     try:
#         with requests.get(image_url, stream=True) as r:
#             r.raise_for_status()
#             with open(local_filepath, 'wb') as f:
#                 shutil.copyfileobj(r.raw, f)
#         logging.info(f"[Download Image] Successfully downloaded {image_url} to {local_filepath}")
#         return relative_url
#     except requests.exceptions.RequestException as e:
#         logging.error(f"[Download Image] Failed to download {image_url}: {e}")
#     except Exception as e:
#         logging.exception(f"[Download Image] Failed to save image to {local_filepath}")
#     return None 