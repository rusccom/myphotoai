import os
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, urlencode

# Загружаем переменные окружения из файла .env
# basedir = os.path.abspath(os.path.dirname(__file__))
# load_dotenv(os.path.join(basedir, '../.env')) # Убираем load_dotenv() отсюда, т.к. он теперь в app.py

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess' # Важно: Замените на реальный секретный ключ в .env
    
    # --- Database Configuration ---
    # DigitalOcean может предоставлять URL с параметром ssl-mode, который не поддерживается mysql-connector-python.
    # Этот код парсит URL, удаляет этот параметр и собирает URL обратно.
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith('mysql'):
        try:
            parsed_url = urlparse(DATABASE_URL)
            query_params = parse_qs(parsed_url.query)
            # Удаляем неподдерживаемые параметры
            query_params.pop('ssl-mode', None)
            query_params.pop('ssl_mode', None) # Также удаляем результат предыдущей попытки исправления
            
            # Пересобираем URL без этих параметров
            new_query = urlencode(query_params, doseq=True)
            DATABASE_URL = parsed_url._replace(query=new_query).geturl()
        except Exception as e:
            print(f"WARNING: Could not parse and modify DATABASE_URL. Error: {e}")

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Ключи Stripe API (будут взяты из .env)
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

    # Ключ Fal.ai API (будет взят из .env)
    # FAL_API_KEY = os.environ.get('FAL_API_KEY') # Удаляем, т.к. fal-client использует FAL_KEY напрямую

    # --- URL и секрет для вебхуков (теперь только для Fal.ai?) ---
    # Оставляем BFL_WEBHOOK_SECRET на случай, если Fal.ai его использует или для будущих провайдеров
    # Уточните, нужен ли секрет для вебхуков Fal.ai
    WEBHOOK_BASE_URL = os.environ.get('FAL_WEBHOOK_BASE_URL', os.environ.get('BFL_WEBHOOK_BASE_URL')) # Используем FAL_ или BFL_
    WEBHOOK_SECRET = os.environ.get('FAL_WEBHOOK_SECRET', os.environ.get('BFL_WEBHOOK_SECRET')) # Используем FAL_ или BFL_

    # --- Новые настройки --- 
    # Папка для загружаемых пользователями файлов (относительно instance_path)
    USER_UPLOADS_FOLDER = 'user_uploads'
    # URL-префикс для доступа к загруженным файлам
    USER_UPLOADS_URL = '/uploads'

    # --- Telegram Bot --- 
    TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
    TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
    # --- Конец Telegram Bot ---

    # Настройки CORS (можно настроить более гранулярно)
    # ВАЖНО: Не используйте "*" с supports_credentials=True - это блокирует WebSocket!
    # Для локальной разработки используем конкретные origins
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS') or "http://localhost:3000,http://localhost:5000"

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_OAUTH_REDIRECT_URI = os.environ.get('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:5000/api/auth/google/callback') 

    # Cloudflare R2 Configuration
    R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT')
    R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY')
    R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_KEY')
    R2_BUCKET_NAME = os.environ.get('R2_BUCKET')
    R2_REGION_NAME = os.environ.get('R2_REGION', 'auto')
    R2_CUSTOM_DOMAIN = os.environ.get('R2_CUSTOM_DOMAIN') # e.g., 'media.myphotoai.net' or None

# Класс для конфигурации тестирования (если нужен)
# class TestingConfig(Config):
#     TESTING = True
#     SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:' # Использовать базу данных в памяти для тестов 