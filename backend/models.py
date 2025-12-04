# Используем относительный импорт для app
from .app import db, login
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime, timedelta
import enum
import uuid
from sqlalchemy import Enum, func, String, text
from flask import current_app # Добавляем current_app для доступа к конфигурации
from .utils.r2_utils import generate_presigned_get_url # Импортируем функцию генерации URL
from enum import Enum as PyEnum

# Enum для типов подписки
class SubscriptionType(enum.Enum):
    FREE = 'free'
    PLUS = 'plus'
    PREMIUM = 'premium'

# Enum для статуса модели
class ModelStatus(enum.Enum):
    TRAINING = 'training'
    READY = 'ready'
    FAILED = 'failed'
    PENDING_DELETION = 'pending_deletion'

# NEW: Enum для типа генерации
class GenerationType(PyEnum):
    MODEL_PHOTO = 'model_photo'
    TEXT_TO_IMAGE = 'text_to_image'
    UPSCALE = 'upscale'
    TRY_ON = 'try_on'
    NANO_BANANA = 'nano_banana'  # Legacy, use EDIT_PHOTO
    EDIT_PHOTO = 'edit_photo'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    # Google OAuth integration
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)

    # Информация о подписке
    subscription_type = db.Column(db.Enum(SubscriptionType), default=SubscriptionType.FREE, nullable=False)
    subscription_start_date = db.Column(db.DateTime)
    subscription_end_date = db.Column(db.DateTime) # Для платных подписок
    stripe_customer_id = db.Column(db.String(120), index=True, unique=True, nullable=True)
    stripe_subscription_id = db.Column(db.String(120), unique=True, nullable=True)

    # Связь с моделями пользователя (один ко многим)
    ai_models = db.relationship('AIModel', backref='owner', lazy='dynamic')

    registered_on = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        # Проверяем, что хэш пароля существует (для пользователей Google OAuth)
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def set_subscription(self, sub_type: SubscriptionType, duration_days: int = None):
        self.subscription_type = sub_type
        self.subscription_start_date = datetime.utcnow()
        if sub_type != SubscriptionType.FREE and duration_days:
            # Стандартная длительность для Plus/Premium, если не указано
            if sub_type == SubscriptionType.PLUS and duration_days is None:
                duration_days = 30
            elif sub_type == SubscriptionType.PREMIUM and duration_days is None:
                 duration_days = 30 # Или 365, в зависимости от вашей модели
            self.subscription_end_date = self.subscription_start_date + timedelta(days=duration_days)
        else:
            self.subscription_end_date = None # Бесплатная подписка бессрочна

    def has_active_subscription(self) -> bool:
        if self.subscription_type == SubscriptionType.FREE:
            return True # Бесплатная всегда активна (в рамках ее лимитов)
        # Проверяем, что есть дата окончания и она еще не наступила
        if self.subscription_end_date and self.subscription_end_date > datetime.utcnow():
            return True
        # Если дата окончания прошла, сбрасываем подписку на бесплатную
        if self.subscription_end_date and self.subscription_end_date <= datetime.utcnow():
             self.set_subscription(SubscriptionType.FREE)
             # Здесь хорошо бы закоммитить изменения в БД, но модель не должна заниматься этим напрямую
             # Это должно происходить в сервисе или view-функции
        return False

    def to_dict(self):
        from sqlalchemy import text
        balance = 0
        try:
            # Используем прямой SQL-запрос к представлению user_balance
            sql = text("SELECT balance_points FROM user_balance WHERE user_id = :user_id")
            result = db.session.execute(sql, {'user_id': self.id}).fetchone()
            if result and result[0] is not None:
                balance = int(result[0])
        except Exception as e:
            current_app.logger.error(f"Could not fetch balance for user {self.id} in to_dict: {e}")
            # В случае ошибки баланс останется 0

        # Убираем информацию о модели отсюда
        return {
            'id': self.id,
            'email': self.email,
            'subscription_type': self.subscription_type.value if self.subscription_type else None,
            'subscription_end_date': self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            'has_active_subscription': self.has_active_subscription(),
            'balance_points': balance, # <-- Добавляем баланс
            # bfl_model_id и status убраны
        }

    def __repr__(self):
        return f'<User {self.email}>'

# Функция загрузчика пользователя для Flask-Login
@login.user_loader
def load_user(id):
    # Эта функция будет вызываться Flask-Login для загрузки пользователя
    # при каждом запросе, если пользователь аутентифицирован в сессии
    return User.query.get(int(id))

# Новая модель для AI Model
class AIModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False) 
    # --- Поля, специфичные для провайдера, удалены или переименованы ---
    # bfl_model_id = db.Column(...) # Удалено
    # service_provider = db.Column(...) # Удалено
    model_url = db.Column(db.String(1024), nullable=True) # URL модели (LoRA от Fal.ai)
    request_id = db.Column(db.String(120), nullable=True, index=True) # ID запроса к API провайдера
    creation_uuid = db.Column(db.String(36), unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4())) # Внутренний UUID
    trigger_word = db.Column(db.String(20), nullable=False)
    status = db.Column(
        Enum(ModelStatus, name='modelstatus', values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        default=ModelStatus.TRAINING,
        nullable=False,
        index=True
    )
    preview_r2_object_key = db.Column(db.String(1024), nullable=True) # Новое поле для ключа R2
    # Параметры пользователя
    gender = db.Column(db.String(20))
    age = db.Column(db.Integer)
    eye_color = db.Column(db.String(30))
    appearance = db.Column(db.String(50))
    concept_type = db.Column(db.String(50), nullable=True) # НОВОЕ ПОЛЕ для хранения 'mode' / типа концепта

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        signed_preview_url = None
        if self.preview_r2_object_key and current_app: # Убедимся, что есть ключ и контекст приложения
            try:
                # Время жизни URL можно вынести в конфиг, если нужно разное для разных сущностей
                expiration = current_app.config.get('R2_PREVIEW_URL_EXPIRATION', 3600) # 1 час по умолчанию для превью
                signed_preview_url = generate_presigned_get_url(self.preview_r2_object_key, expiration=expiration)
            except Exception as e:
                # Логируем ошибку, если не удалось сгенерировать URL
                current_app.logger.error(f"Error generating signed preview URL for AIModel {self.id}: {e}")

        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'model_url': self.model_url, # <-- Переименовано
            'request_id': self.request_id, # <-- Переименовано
            'creation_uuid': self.creation_uuid,
            'trigger_word': self.trigger_word,
            'status': self.status.value if self.status else None,
            'preview_r2_object_key': self.preview_r2_object_key, # Новое поле
            'signed_preview_url': signed_preview_url, # Добавляем подписанный URL
            'gender': self.gender,
            'age': self.age,
            'eye_color': self.eye_color,
            'appearance': self.appearance,
            'concept_type': self.concept_type, # Добавляем новое поле в to_dict
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        return data

    def __repr__(self):
        return f'<AIModel {self.id} (UUID: {self.creation_uuid}) for User {self.user_id}>'

# Модель для хранения информации о сгенерированных изображениях
class GeneratedImage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    ai_model_id = db.Column(db.Integer, db.ForeignKey('ai_model.id'), nullable=True, index=True) # Может быть NULL для text-to-image и upscale

    user = db.relationship('User', backref=db.backref('generated_images', lazy='dynamic'))
    ai_model = db.relationship('AIModel', backref=db.backref('generated_images', lazy='dynamic')) 

    # NEW: Тип генерации
    generation_type = db.Column(
        Enum(GenerationType, name='generationtype', values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        index=True
    )
    # Поле для хранения URL оригинального изображения для апскейла
    original_image_url = db.Column(db.String(1024), nullable=True)

    prompt = db.Column(db.Text, nullable=True) # Может быть NULL для upscale
    style = db.Column(db.String(50))
    camera_angle = db.Column(db.String(50))
    emotion = db.Column(db.String(50))
    width = db.Column(db.Integer, default=1024)
    height = db.Column(db.Integer, default=1024)
    # --- Поля провайдера переименованы --- 
    model_url = db.Column(db.String(1024), nullable=True) # URL LoRA Fal.ai (скопировано из AIModel)
    request_id = db.Column(db.String(120), index=True, nullable=True) # ID запроса к API Fal.ai
    download_url = db.Column(db.String(1024), nullable=True) # URL для скачивания от Fal.ai (может стать неактуальным)
    r2_object_key = db.Column(db.String(1024), nullable=True) # Ключ объекта в R2
    status = db.Column(db.String(30), default='Pending', index=True) 
    is_downloaded = db.Column(db.Boolean, default=False, nullable=False) # Это поле может отражать, успешно ли загружен файл в R2
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        # Helper function to format datetime with 'Z'
        def format_datetime_utc(dt):
            if dt:
                # Assume dt is naive UTC, format and add Z
                return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
            return None
        
        signed_image_url = None
        if self.r2_object_key and self.status == 'Ready' and current_app: # Генерируем URL только для готовых изображений
            try:
                expiration = current_app.config.get('R2_GENERATED_IMAGE_URL_EXPIRATION', 3600) # 1 час
                signed_image_url = generate_presigned_get_url(self.r2_object_key, expiration=expiration)
            except Exception as e:
                current_app.logger.error(f"Error generating signed image URL for GeneratedImage {self.id}: {e}")

        calculated_aspect_ratio = None
        # Возвращаем aspect_ratio только если статус 'Ready'
        # и есть валидные width и height.
        if self.status == 'Ready' and self.width and self.height and self.width > 0 and self.height > 0:
            calculated_aspect_ratio = f"{self.width}:{self.height}"
        # Для других статусов (Pending, Failed, etc.) calculated_aspect_ratio останется None.
        # Это позволит фронтенду использовать свой formSelectedAspectRatio для плейсхолдеров.

        return {
            'id': self.id,
            'user_id': self.user_id,
            'ai_model_id': self.ai_model_id,
            'generation_type': self.generation_type.value if self.generation_type else None,
            'original_image_url': self.original_image_url,
            'prompt': self.prompt,
            'style': self.style,
            'camera_angle': self.camera_angle,
            'emotion': self.emotion,
            'width': self.width,
            'height': self.height,
            'aspect_ratio': calculated_aspect_ratio, # Добавляем вычисленное соотношение сторон
            'model_url': self.model_url, 
            'request_id': self.request_id, 
            'r2_object_key': self.r2_object_key, 
            'signed_url': signed_image_url, 
            'status': self.status,
            'is_downloaded': self.is_downloaded,
            'created_at': format_datetime_utc(self.created_at), 
            'updated_at': format_datetime_utc(self.updated_at), 
        }

    def __repr__(self):
        return f'<GeneratedImage {self.id} by User {self.user_id}>'

# Модель для платежей
class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    amount_usd = db.Column(db.Numeric(10, 2), nullable=False) # Сумма в долларах США (например, 10.99)
    amount_points = db.Column(db.Integer, nullable=False) # Сумма во внутренней валюте (очках)
    payment_time = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    # Дополнительно: ID транзакции из платежной системы (Stripe, etc.)
    transaction_id = db.Column(db.String(120), unique=True, nullable=True, index=True)
    status = db.Column(db.String(30), default='completed', index=True) # Например, pending, completed, failed

    user = db.relationship('User', backref=db.backref('payments', lazy='dynamic'))

    def __init__(self, user_id, amount_usd, transaction_id=None, status='completed'):
        self.user_id = user_id
        self.amount_usd = amount_usd
        # Конвертация: 1 цент = 1 очко => сумма_в_очках = сумма_в_долларах * 100
        self.amount_points = int(float(amount_usd) * 100)
        self.transaction_id = transaction_id
        self.status = status

    def __repr__(self):
        return f'<Payment {self.id} by User {self.user_id} for ${self.amount_usd}>'

    # Метод для сериализации в словарь
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount_usd': str(self.amount_usd), # Конвертируем Decimal в строку
            'amount_points': self.amount_points,
            'payment_time': self.payment_time.isoformat() if self.payment_time else None,
            'transaction_id': self.transaction_id,
            'status': self.status
        }

# Модель для платных действий
class PaidAction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    action_type = db.Column(db.String(50), nullable=False, index=True) # Тип действия (e.g., 'generate_image', 'train_model')
    cost_points = db.Column(db.Integer, nullable=False) # Стоимость действия в очках
    action_time = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    # Дополнительно: связь с конкретным результатом действия, если нужно
    # Например, ссылка на сгенерированное изображение или обученную модель
    # related_object_id = db.Column(db.Integer, nullable=True)
    # related_object_type = db.Column(db.String(50), nullable=True)

    user = db.relationship('User', backref=db.backref('paid_actions', lazy='dynamic'))

    def __repr__(self):
        return f'<PaidAction {self.id} by User {self.user_id}, type: {self.action_type}, cost: {self.cost_points}>'


# Модель для категорий пресетов
class PresetCategory(db.Model):
    """Категории пресетов (Portraits, Fashion, Professional, etc.)"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    slug = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255), nullable=True)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Связь с пресетами
    presets = db.relationship('Preset', backref='category', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
            'presets_count': self.presets.filter_by(is_active=True).count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<PresetCategory {self.id}: {self.name}>'


# Модель для пресетов
class Preset(db.Model):
    """Пресеты для быстрой генерации"""
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('preset_category.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    r2_object_key = db.Column(db.String(1024), nullable=True)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        signed_url = None
        if self.r2_object_key and current_app:
            try:
                expiration = current_app.config.get('R2_PRESET_URL_EXPIRATION', 3600)
                signed_url = generate_presigned_get_url(self.r2_object_key, expiration=expiration)
            except Exception as e:
                current_app.logger.error(f"Error generating signed URL for Preset {self.id}: {e}")

        return {
            'id': self.id,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'name': self.name,
            'prompt': self.prompt,
            'r2_object_key': self.r2_object_key,
            'signed_url': signed_url,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Preset {self.id}: {self.name}>'


# Представление для баланса пользователя (SQL View)
# ПРЕДУПРЕЖДЕНИЕ: Создание представлений обычно выполняется через миграции (Alembic).
# Этот код демонстрирует, как можно было бы определить его в SQLAlchemy,
# но фактическое создание/обновление представления должно управляться миграциями.

# Пример SQL для создания представления (зависит от диалекта):
# CREATE VIEW user_balance AS
# SELECT
#     u.id AS user_id,
#     u.email AS user_email, -- Или другое поле для имени, если есть
#     COALESCE(SUM(p.amount_points), 0) - COALESCE(SUM(pa.cost_points), 0) AS balance_points
# FROM
#     "user" u -- Используйте кавычки, если имя таблицы 'user' зарезервировано
# LEFT JOIN
#     payment p ON u.id = p.user_id AND p.status = 'completed' -- Учитываем только успешные платежи
# LEFT JOIN
#     paid_action pa ON u.id = pa.user_id
# GROUP BY
#     u.id, u.email;

# Определение представления с использованием SQLAlchemy (для информации, не для прямого выполнения):
# from sqlalchemy import select, func, literal_column
# from sqlalchemy.schema import CreateView
# from sqlalchemy.ext.compiler import compiles

# # Определяем запрос SELECT для представления
# user_balance_select = (
#     select(
#         User.id.label('user_id'),
#         User.email.label('user_email'),
#         (
#             func.coalesce(func.sum(Payment.amount_points), 0) -
#             func.coalesce(func.sum(PaidAction.cost_points), 0)
#         ).label('balance_points')
#     )
#     .select_from(User)
#     .outerjoin(Payment, (User.id == Payment.user_id) & (Payment.status == 'completed'))
#     .outerjoin(PaidAction, User.id == PaidAction.user_id)
#     .group_by(User.id, User.email)
# )

# # Определение View (не класс Model)
# class UserBalance(db.Model): # Это НЕ таблица, а обертка для запросов к view
#     __table__ = db.Table('user_balance', db.metadata, autoload_with=db.engine) # Предполагаем, что view уже существует
#     # Или использовать __table__ = create_view('user_balance', user_balance_select, db.metadata)
#     # Но создание view лучше делать в миграциях
#     user_id = db.Column(db.Integer, primary_key=True) # Нужен PK для SQLAlchemy
#     user_email = db.Column(db.String)
#     balance_points = db.Column(db.Integer)

# # Компилятор для CreateView (может понадобиться для Alembic)
# @compiles(CreateView)
# def compile_create_view(element, compiler, **kw):
#      return f"CREATE VIEW {element.name} AS {compiler.process(element.selectable, literal_binds=True)}"

# view = CreateView('user_balance', user_balance_select)
# print(view) # Выведет SQL для создания VIEW

# Можно добавить другие модели здесь, например, для хранения ссылок на сгенерированные изображения:
# class GeneratedImage(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
#     image_url = db.Column(db.String(512))
#     prompt = db.Column(db.Text)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     user = db.relationship('User', backref=db.backref('images', lazy='dynamic')) 