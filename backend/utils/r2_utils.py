import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from flask import current_app
import logging
from urllib.parse import urlparse, urlunparse, unquote

s3_client = None

def get_r2_client():
    """Инициализирует и возвращает клиент S3 для работы с R2."""
    global s3_client
    if s3_client is None:
        try:
            s3_client = boto3.client(
                service_name='s3',
                endpoint_url=current_app.config['R2_ENDPOINT_URL'],
                aws_access_key_id=current_app.config['R2_ACCESS_KEY_ID'],
                aws_secret_access_key=current_app.config['R2_SECRET_ACCESS_KEY'],
                region_name=current_app.config['R2_REGION_NAME'],
                config=Config(signature_version='s3v4')
            )
            logging.info("R2 client initialized successfully.")
        except Exception as e:
            logging.error(f"Error initializing R2 client: {e}")
            raise
    return s3_client

def _replace_host_for_custom_domain(url: str) -> str:
    """Заменяет хост в URL на кастомный домен R2 и удаляет имя бакета из пути, если он задан."""
    custom_domain = current_app.config.get('R2_CUSTOM_DOMAIN')
    if not custom_domain or not url:
        return url
    
    try:
        parts = list(urlparse(url))
        r2_endpoint_host = urlparse(current_app.config['R2_ENDPOINT_URL']).netloc
        bucket_name = current_app.config.get('R2_BUCKET_NAME')

        if parts[1] == r2_endpoint_host and bucket_name:
            # parts[2] is the path, e.g., /bucket_name/object/key.jpg
            # Удаляем имя бакета из начала пути, если оно там есть
            # unquote нужен, если имя бакета содержит символы, которые URL-кодируются в пути
            path_without_bucket = parts[2]
            # Путь может начинаться с /<bucket_name>/ или просто /<bucket_name>
            # Мы должны быть осторожны, чтобы не удалить часть ключа объекта, если он случайно начнется так же
            # Строго проверяем /<bucket_name>/
            bucket_prefix_in_path = f"/{unquote(bucket_name)}/"
            if path_without_bucket.startswith(bucket_prefix_in_path):
                path_without_bucket = path_without_bucket[len(bucket_prefix_in_path)-1:] # Оставляем один / в начале
            
            parts[1] = custom_domain
            parts[2] = path_without_bucket
            return urlunparse(parts)
        
        return url # Не меняем, если хост не совпадает с R2 endpoint или нет имени бакета
    except Exception as e:
        logging.warning(f"Could not replace host/path for custom R2 domain in URL '{url}': {e}")
        return url

def upload_file_to_r2(file_obj, object_key: str, content_type: str = 'application/octet-stream', acl: str = 'private'):
    """
    Загружает файлоподобный объект в R2.

    :param file_obj: Файлоподобный объект (например, BytesIO, или открытый файл в бинарном режиме).
    :param object_key: Ключ объекта в R2 (путь/имя файла).
    :param content_type: MIME-тип файла.
    :param acl: Access Control List для объекта. По умолчанию 'private'.
                Для R2 обычно используется 'private', а доступ контролируется через pre-signed URLs
                или политики бакета. 'public-read' может быть использован, если бакет и объект
                предназначены для публичного доступа через кастомный домен.
    :return: True в случае успеха, False в противном случае.
    """
    client = get_r2_client()
    bucket_name = current_app.config['R2_BUCKET_NAME']
    try:
        client.upload_fileobj(
            Fileobj=file_obj,
            Bucket=bucket_name,
            Key=object_key,
            ExtraArgs={
                'ContentType': content_type,
                'ACL': acl
            }
        )
        logging.info(f"Successfully uploaded {object_key} to R2 bucket {bucket_name}.")
        # Если используется кастомный публичный домен и ACL 'public-read', можно вернуть прямой URL
        # if acl == 'public-read' and current_app.config.get('R2_CUSTOM_DOMAIN'):
        #     return f"https://{current_app.config['R2_CUSTOM_DOMAIN']}/{object_key}"
        return True # Возвращаем True для обозначения успеха загрузки
    except ClientError as e:
        logging.error(f"Failed to upload {object_key} to R2: {e}")
        return False
    except Exception as e:
        logging.error(f"An unexpected error occurred during R2 upload of {object_key}: {e}")
        return False

def generate_presigned_get_url(object_key: str, expiration: int = 3600):
    """
    Генерирует подписанный URL для получения объекта из R2.

    :param object_key: Ключ объекта в R2.
    :param expiration: Время жизни URL в секундах (по умолчанию 1 час).
    :return: Подписанный URL в виде строки или None в случае ошибки.
    """
    client = get_r2_client()
    bucket_name = current_app.config['R2_BUCKET_NAME']
    try:
        url = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=expiration
        )
        # Заменяем хост, если настроен кастомный домен R2_CUSTOM_DOMAIN
        # Это полезно, если вы хотите, чтобы URL выглядел как https://media.myphotoai.net/...
        # а не https://<account_id>.r2.cloudflarestorage.com/...
        # Однако, для pre-signed URLs, стандартный эндпоинт R2 должен быть доступен Cloudflare для проверки подписи.
        # Для публичных бакетов с кастомным доменом, эта замена нужна, для pre-signed URLs - она может быть опциональной или даже нежелательной,
        # если кастомный домен не настроен на корректную работу с pre-signed логикой.
        # Оставляем замену, так как инструкция её предлагает, но нужно учитывать настройки домена.
        final_url = _replace_host_for_custom_domain(url)
        logging.info(f"Generated pre-signed GET URL for {object_key}: {final_url}")
        return final_url
    except ClientError as e:
        logging.error(f"Failed to generate pre-signed GET URL for {object_key}: {e}")
        return None
    except Exception as e:
        logging.error(f"An unexpected error occurred generating pre-signed GET URL for {object_key}: {e}")
        return None

def delete_file_from_r2(object_key: str):
    """
    Удаляет объект из R2.

    :param object_key: Ключ объекта в R2.
    :return: True в случае успеха, False в противном случае.
    """
    client = get_r2_client()
    bucket_name = current_app.config['R2_BUCKET_NAME']
    try:
        client.delete_object(Bucket=bucket_name, Key=object_key)
        logging.info(f"Successfully deleted {object_key} from R2 bucket {bucket_name}.")
        return True
    except ClientError as e:
        logging.error(f"Failed to delete {object_key} from R2: {e}")
        return False
    except Exception as e:
        logging.error(f"An unexpected error occurred during R2 deletion of {object_key}: {e}")
        return False

# Пример использования (можно удалить или закомментировать):
# def example_upload_and_get_url():
#     from io import BytesIO
#     # Нужен контекст приложения Flask для доступа к current_app.config
#     # from your_app import create_app
#     # app = create_app()
#     # with app.app_context():
#     #     test_file_content = b"Hello R2!"
#     #     test_file_obj = BytesIO(test_file_content)
#     #     test_object_key = "test/example.txt"
# 
#     #     if upload_file_to_r2(test_file_obj, test_object_key, content_type="text/plain"):
#     #         presigned_url = generate_presigned_get_url(test_object_key)
#     #         if presigned_url:
#     #             print(f"Access your file at: {presigned_url}")
#     #         else:
#     #             print("Failed to get pre-signed URL.")
#     #         # delete_file_from_r2(test_object_key) # Опционально удалить
#     #     else:
#     #         print("Failed to upload file.") 