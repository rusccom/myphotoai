import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, request, jsonify, abort
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager, current_user, login_required
from flask_cors import CORS
from dotenv import load_dotenv

# Вызываем load_dotenv() ДО импорта Config и создания app
load_dotenv()

# Используем относительный импорт для config
from .config import Config

db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
# Указываем Flask-Login, где находится view-функция для входа
# Это нужно, чтобы @login_required мог перенаправлять неаутентифицированных пользователей
login.login_view = 'auth.login' # Мы определим 'auth.login' позже в auth.py

def setup_logging(app):
    # Создаем папку logs, если ее нет
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Файловый обработчик с ротацией
    # 10MB на файл, храним 5 старых файлов
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240*1024, backupCount=5, encoding='utf-8')
    
    # Форматтер логов
    log_formatter = logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    )
    file_handler.setFormatter(log_formatter)
    
    # Уровень логирования для файла
    file_handler.setLevel(logging.INFO) # Пишем INFO и выше (WARNING, ERROR, CRITICAL)
    # Если нужен DEBUG, установите logging.DEBUG
    
    # Получаем корневой логгер
    root_logger = logging.getLogger()
    # Устанавливаем общий уровень для корневого логгера
    # Если здесь DEBUG, то и хендлер сможет писать DEBUG
    root_logger.setLevel(logging.INFO)
    
    # Удаляем стандартные обработчики (если есть), чтобы избежать дублирования
    # Особенно важно, если Flask добавляет свой StreamHandler
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    # Добавляем наш файловый обработчик к корневому логгеру
    root_logger.addHandler(file_handler)
    
    # Добавляем обработчик и к логгеру Flask (на всякий случай)
    # app.logger.addHandler(file_handler)
    # app.logger.setLevel(logging.INFO)
    
    # Логгируем старт конфигурации логов
    root_logger.info('Application Logging Started')

def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)
    # Убедимся, что папка instance существует
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass # Ошибка будет позже, если запись невозможна
    
    setup_logging(app)

    # Инициализация расширений
    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)
    
    # --- Упрощенная глобальная конфигурация CORS --- 
    # Применяем ко всем маршрутам, берем origins из конфига
    CORS(app, supports_credentials=True, origins=app.config['CORS_ORIGINS'])
    # --- Конец упрощенной конфигурации --- 

    # --- ЛОГИРОВАНИЕ ПЕРЕД КАЖДЫМ ЗАПРОСОМ (ВКЛЮЧАЯ OPTIONS) ---
    @app.before_request
    def log_request_info():
        # Используем app.logger или корневой логгер logging
        logging.info('>>> Request Start >>>')
        logging.info(f'Method: {request.method}')
        logging.info(f'Path: {request.path}')
        logging.info(f'Headers: \n{request.headers}')
        # Логирование тела может быть полезно, но осторожно с большими данными/паролями
        # if request.data:
        #    try:
        #       logging.info(f'Body: {request.get_data(as_text=True)}')
        #    except Exception:
        #        logging.info('Body: (Could not decode as text)')
        logging.info('>>> Request End >>>')
    # --- КОНЕЦ ЛОГИРОВАНИЯ ---

    # Регистрация Blueprints (маршрутов)
    # Используем относительные импорты для Blueprints и моделей
    from .routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from .routes.payment import bp as payment_bp
    app.register_blueprint(payment_bp, url_prefix='/api/payment')

    from .routes.model import bp as model_bp
    app.register_blueprint(model_bp, url_prefix='/api/model')

    from .routes.generation import bp as generation_bp
    app.register_blueprint(generation_bp, url_prefix='/api/generation')

    # Убедимся, что модели импортируются после инициализации db
    with app.app_context():
        from . import models # Импортируем модуль models целиком

    # Простой тестовый маршрут
    @app.route('/api/ping')
    def ping():
        app.logger.info('Ping endpoint was called')
        return 'Pong!'

    # --- НОВЫЕ МАРШРУТЫ ДЛЯ ПОЛУЧЕНИЯ PRE-SIGNED URL R2 (УДАЛИТЬ) ---
    # @app.route('/api/r2/generated-image-url/<int:image_id>', methods=['GET'])
    # @login_required
    # def get_r2_generated_image_url(image_id):
    #     # ... (код удален)
    #     pass

    # @app.route('/api/r2/model-preview-url/<int:model_db_id>', methods=['GET'])
    # @login_required
    # def get_r2_model_preview_url(model_db_id):
    #     # ... (код удален)
    #     pass    
    # --- КОНЕЦ НОВЫХ МАРШРУТОВ ДЛЯ R2 (УДАЛИТЬ) ---

    app.logger.info('Flask app created successfully')
    return app

# Создаем экземпляр приложения (можно использовать для запуска через flask run)
# Для продакшена лучше использовать фабрику create_app с Gunicorn
# if __name__ == '__main__':
#     app = create_app()
#     app.run(debug=True) 