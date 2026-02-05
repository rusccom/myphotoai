# Архитектура проекта MyPhotoAI

## 📋 Обзор

**MyPhotoAI** - веб-приложение для генерации AI-изображений с использованием пользовательских моделей.

**Стек:**
- **Frontend**: React 18.3.1, React Router v6, CSS Modules
- **Backend**: Flask (Python), SQLAlchemy, Flask-Login, Authlib
- **База данных**: MySQL (DigitalOcean)
- **Хранилище**: Cloudflare R2
- **AI**: Fal.ai API
- **Платежи**: Stripe
- **OAuth**: Google OAuth 2.0
- **Real-time**: Flask-SocketIO (WebSocket)

---

## 🏗 Структура проекта

```
AIModel/
├── frontend/
│   ├── src/
│   │   ├── components/         # Глобальные компоненты
│   │   │   ├── home/           # Компоненты лендинга
│   │   │   └── SEO.jsx         # SEO метатеги
│   │   ├── pages/              # Страницы приложения
│   │   ├── features/
│   │   │   └── dashboard/      # Feature: Dashboard
│   │   │       ├── components/ # Вкладки генерации
│   │   │       └── hooks/      # Хуки дашборда
│   │   ├── hooks/              # Глобальные хуки
│   │   ├── context/            # React Context (AuthContext)
│   │   ├── services/           # API клиент (api.js)
│   │   └── constants/          # Константы (aspectRatio.js)
│   └── public/
│       ├── media/              # Только hero-background.jpg
│       └── sitemap.xml
│
├── backend/
│   ├── routes/                 # API эндпоинты (blueprints)
│   │   ├── auth.py             # /api/auth/*
│   │   ├── model.py            # /api/model/*
│   │   ├── generation.py       # /api/generation/*
│   │   ├── payment.py          # /api/payment/*
│   │   ├── admin.py            # /api/admin/*
│   │   ├── preset.py           # /api/preset/*
│   │   └── websocket.py        # WebSocket handlers
│   ├── services/
│   │   └── generation/         # Strategy Pattern для генерации
│   │       ├── base.py         # BaseGenerationStrategy
│   │       ├── factory.py      # GenerationFactory
│   │       └── strategies/     # Стратегии по типам
│   ├── utils/                  # Утилиты (R2, costs, notifications)
│   ├── app.py                  # Flask factory
│   ├── models.py               # SQLAlchemy модели
│   ├── config.py               # Конфигурация
│   └── costs_config.json       # Стоимость операций
│
├── migrations/                 # Alembic миграции БД
└── logs/                       # Логи приложения
```

---

## 🧹 Служебные папки (не часть приложения)

- **`instance/`**: служебная папка Flask для instance config/локальных файлов, хранится вне репозитория (игнорируется в `.gitignore`).
- **`assets/` (в корне)**: служебные изображения, которые Cursor может сохранять из `workspaceStorage` (например, вставленные в IDE картинки). Не используются приложением и игнорируются в `.gitignore`.

## 🎨 Frontend

### Страницы

**Публичные:**
| Путь | Компонент | Описание |
|------|-----------|----------|
| `/` | HomePage | Лендинг |
| `/login` | LoginPage | Вход |
| `/register` | RegisterPage | Регистрация |
| `/pricing` | PricePage | Тарифы |
| `/terms-and-privacy` | TermsAndPrivacyPage | Юридическая информация |
| `/admin` | AdminPage | Админ-панель (по паролю) |

**Защищённые (требуют авторизации):**
| Путь | Компонент | Описание |
|------|-----------|----------|
| `/dashboard` | DashboardPage | Панель генерации |
| `/create-model` | CreateModelPage | Создание AI модели |
| `/account` | AccountPage | Настройки аккаунта |
| `/billing` | BillingPage | Покупка поинтов |

### Ключевые компоненты

```
components/
├── Layout.js              # Navbar + Footer обёртка
├── Navbar.js              # Навигация, баланс
├── Footer.js              # Минималистичный футер
├── ProtectedRoute.js      # HOC для защиты маршрутов
├── ImageModal.js          # Модальное окно просмотра
├── FileUploader.jsx       # Drag & Drop загрузчик (инкрементное добавление/удаление)
├── UniversalSubmitButton.js # Кнопка "GO (Cost: X points)"
└── NumImagesSelect.js     # Селектор количества
```

### Dashboard (features/dashboard/)

**Вкладки генерации (левая панель):**
| Компонент | Тип | Описание |
|-----------|-----|----------|
| EditPhotoTab | edit_photo | Редактирование (Nano Banana / Flux 2 Pro) |
| ModelPhotoTab | model_photo | Генерация с LoRA моделью |
| TextToImageTab | text_to_image | Text to Image |
| ClothingTryOnTab | try_on | Примерка одежды |
| UpscaleTab | upscale | Увеличение разрешения |
| LivePhotoTab | - | Живое фото (в разработке) |

**Вкладки правой панели:**
| Компонент | Описание |
|-----------|----------|
| PhotoGallery | Галерея сгенерированных фото |
| PresetTab | Пресеты для быстрой генерации |

**Хуки:**
- `useImageHistory` - история генераций, polling, пагинация
- `useFileUpload` - загрузка файлов с preview
- `useGenerationHandlers` - обработчики отправки форм
- `useWebSocket` - WebSocket подключение

### AuthContext

**Состояние:** user, isAuthenticated, isLoading, models  
**Функции:** login, loginWithGoogle, register, logout, refreshModels, updateUser, api

---

## 🔧 Backend

### Модели данных (models.py)

**User:**
- id, email, password_hash, google_id
- subscription_type (FREE/PLUS/PREMIUM)
- stripe_customer_id, stripe_subscription_id
- Связи: ai_models, generated_images, payments, paid_actions

**AIModel:**
- id, user_id, name, model_url, trigger_word
- status (TRAINING/READY/FAILED/PENDING_DELETION)
- preview_r2_object_key, gender, age
- concept_type (`flux` / `flux2` - тип trainer-а)

**GeneratedImage:**
- id, user_id, ai_model_id (nullable)
- generation_type (MODEL_PHOTO/TEXT_TO_IMAGE/UPSCALE/TRY_ON/EDIT_PHOTO)
- prompt, r2_object_key, status (Pending/Ready/Failed)
- width, height

**Payment:** id, user_id, amount_usd, amount_points, status  
**PaidAction:** id, user_id, action_type, cost_points

**PresetCategory:**
- id, name, slug, description
- sort_order, is_active
- Связь: presets (one-to-many)

**Preset:**
- id, category_id, name, prompt
- r2_object_key, sort_order, is_active

**SQL View `user_balance`:** balance_points = SUM(payments) - SUM(paid_actions)

### API эндпоинты

**Auth (`/api/auth/`):**
- POST `/register`, `/login`, `/logout`
- GET `/status` - проверка авторизации
- POST `/change-password`
- GET `/google/login`, `/google/callback` - OAuth

**Model (`/api/model/`):**
- POST `/create` - создание AI модели (FormData, поддержка двух типов)
- GET `/list`, `/status/<uuid>`

**Типы моделей (MODEL_CONFIGS в model.py):**
| Тип | Endpoint | Описание |
|-----|----------|----------|
| `flux2` | `fal-ai/flux-2-trainer` | Универсальный trainer (стили, бренды, персонажи) |
| `flux` | `fal-ai/flux-lora-portrait-trainer` | Portrait trainer (фото людей) |

**Generation (`/api/generation/`):**
- POST `/start` - универсальный endpoint (Strategy Pattern)
- GET `/history` - история генераций
- GET `/costs` - стоимости операций
- POST `/webhook/<request_id>` - webhook от Fal.ai

**Payment (`/api/payment/`):**
- POST `/create-checkout-session`
- POST `/webhook` - Stripe webhooks

**Admin (`/api/admin/`):**
- POST `/verify` - проверка пароля
- GET/POST/DELETE `/media/<section>` - управление медиа R2

**Preset (`/api/preset/`):**
- GET `/categories` - список активных категорий
- GET `/list` - список активных пресетов (включает prompt)
- Admin CRUD: `/admin/categories`, `/admin/presets`

*Генерация по пресету выполняется через `/api/generation/start` с type: `model_photo` и prompt из пресета.*

### Generation Strategy Pattern

Все типы генерации идут через один endpoint с паттерном Strategy:

```
POST /api/generation/start
{ "type": "model_photo", ... }
```

**Структура:**
```
services/generation/
├── base.py           # BaseGenerationStrategy (Template Method)
├── factory.py        # GenerationFactory.get(type) → Strategy
└── strategies/
    ├── model_photo.py    # LoRA генерация
    ├── text_to_image.py  # Flux 2 Pro
    ├── upscale.py        # SeedVR Upscaler
    ├── try_on.py         # Flux 2 LoRA Gallery Virtual Try-On
    └── edit_photo.py     # Nano Banana Pro / Flux 2 Pro Edit
```

**BaseGenerationStrategy.execute():**
1. validate_input()
2. check_balance_and_deduct()
3. prepare_files() (optional)
4. build_fal_arguments()
5. submit_to_fal()
6. create_db_records()
7. handle_errors() с refund

### Стоимость операций (costs_config.json)

```json
{
  "model_training": 50,
  "model_photo": 1,
  "text_to_image": 1,
  "upscale": 1,
  "virtual_try_on": 10,
  "edit_photo_nano_banana": 5,
  "edit_photo_flux": 5
}
```

**Конверсия:** 1 USD = 100 points

### WebSocket (Real-time)

- Flask-SocketIO с gevent worker
- Events: `connect`, `disconnect`, `join_user_room`, `image_updated`
- Room: `user_{user_id}`
- Webhook от Fal.ai → emit `image_updated` → мгновенное обновление UI

---

## 📦 Хранилище R2

```
bucket/
├── users/{user_id}/
│   ├── model_previews/     # Превью AI моделей
│   └── photos/             # Сгенерированные фото
│
├── presets/                # Пресеты (плоская структура, БД-driven)
│   ├── 1.jpg               # preset.id = 1
│   ├── 2.jpg               # preset.id = 2
│   └── ...
│
└── landing/                # Медиа лендинга (через админку)
    ├── model-generation/
    │   ├── main/main.jpg
    │   ├── grid/image-{1-12}.jpg
    │   ├── main2/main.jpg
    │   └── grid2/image-{1-12}.jpg
    ├── photo-editing/      # Radial Fan layout (5 блоков)
    │   ├── 1/              # Блок 1
    │   │   ├── original.jpg
    │   │   ├── 1.jpg       # Результат 1
    │   │   ├── 2.jpg       # Результат 2
    │   │   ├── 3.jpg       # Результат 3
    │   │   └── 4.jpg       # Результат 4
    │   ├── 2/ ... 5/       # Блоки 2-5 (та же структура)
    ├── clothing-try-on/    # Layout: 3 сверху, 1 по центру внизу
    │   └── {1-4}/          # 4 блока × 3 изображения
    │       ├── 1.jpg       # Before
    │       ├── 2.jpg       # Clothing
    │       └── 3.jpg       # Result
    └── live-photo/
```

**utils/r2_utils.py:** upload, download, generate_presigned_url, delete

**Кэширование landing медиа:**
- При загрузке через админку устанавливается `Cache-Control: no-cache, max-age=0, must-revalidate`
- Браузер проверяет актуальность файла при каждом запросе через ETag
- Если файл не изменился — используется кэш (304 Not Modified)
- В админке используется локальный cache-busting (`?v=timestamp`) — обновляется только конкретный файл, а не вся секция
- Cloudflare: рекомендуется настроить Cache Rule с Bypass cache для `/landing/*`

---

## 📝 Соглашения о коде

**Правило 5-300-20-3:**
- ≤5 параметров у функции
- ≤300 строк на файл
- ≤20 строк на метод
- ≤3 уровня вложенности

**Один компонент/класс - один файл**

**Feature-based структура** - каждая фича в отдельной папке

---

## 🔒 Безопасность

- Cookie-based сессии (Flask-Login)
- Пароли: werkzeug.security
- Google OAuth: state parameter (CSRF protection)
- Presigned URLs с истечением (1 час)
- Stripe webhook signature verification

---

## ⚙️ Конфигурация

**Backend (.env):**
```
DATABASE_URL, SECRET_KEY
FAL_KEY, FAL_WEBHOOK_BASE_URL, FAL_WEBHOOK_SECRET
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_CUSTOM_DOMAIN
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
CORS_ORIGINS, ADMIN_PASSWORD
```

**Frontend (.env.local):**
```
REACT_APP_WS_BASE_URL=http://localhost:5000
REACT_APP_R2_URL=https://media.myphotoai.net
```

---

## 🚀 Запуск

**Локальная разработка:**
```bash
# Backend
.\venv\Scripts\Activate.ps1
python run_dev.py

# Frontend
cd frontend && npm start
```

**Продакшен (Gunicorn):**
```bash
gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
  -w 1 --timeout 120 backend.wsgi:app
```

---

## 📌 Добавление нового типа генерации

1. Создать `strategies/new_type.py`:
```python
class NewTypeStrategy(BaseGenerationStrategy):
    config = GenerationConfig(
        action_type='new_type',
        generation_type=GenerationType.NEW_TYPE,
        fal_model='fal-ai/new-model',
    )
    def validate_input(self, data): ...
    def build_fal_arguments(self, data, file_urls): ...
```

2. Зарегистрировать: `GenerationFactory.register('new_type', NewTypeStrategy)`
3. Добавить стоимость в `costs_config.json`
4. Добавить enum в `models.py`
5. Создать компонент вкладки на фронтенде

---

_Последнее обновление: 2025-12-22_ (ClothingTryOn: layout изменён на 3 блока сверху + 1 по центру внизу)
