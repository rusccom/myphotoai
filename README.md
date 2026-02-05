# MyPhotoAI - Personalized AI Model Creation and Generation Service

A modern web application for creating AI models based on your photos and generating images featuring you in various styles and scenarios.

## Features

- 🧠 Create a personalized AI model based on your photos
- 🖼️ Generate photorealistic images using text prompts
- 🎬 Create videos based on generated images (in development)
- 💰 Pay-as-you-go points system
- 🔒 Secure authentication and data protection

## Technologies

- **Frontend**: React.js, React Router, CSS Modules
- **Backend**: Flask (Python), SQLAlchemy
- **Authentication**: JWT
- **Payment**: Stripe
- **AI/ML**: BFL API for model creation and image generation

## Modern Design

The project features a modern UI using:
- Dark theme with bright accents and gradients
- Unified design system with CSS variables
- Gradient elements and accents
- Animations and interactive elements
- Responsive layout for all devices
- Modern typography (Inter font)

## Setup Instructions

### Requirements

- Python 3.8+
- Node.js 14+
- npm or yarn

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd MyPhotoAI
```

2. Create and activate a virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# MacOS/Linux
python -m venv venv
source venv/bin/activate
```

3. Install backend dependencies:
```bash
pip install -r requirements.txt
```

4. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

5. Create a `.env` file in the root directory with the following variables:
```
FLASK_APP="backend.app:create_app()"
SECRET_KEY=your_secret_key
DATABASE_URL=your_mysql_database_url
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
FAL_KEY=your_fal_api_key
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
R2_ENDPOINT=your_cloudflare_r2_endpoint
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
R2_BUCKET=your_r2_bucket_name

# ⚠️ ВАЖНО: Для локальной разработки с общей БД укажите URL продакшен сервера
# Это позволит Fal.ai отправлять webhooks на продакшен, который сохранит результаты в общую БД
FAL_WEBHOOK_BASE_URL=https://your-production-url.ondigitalocean.app

# Для полностью изолированной локальной разработки используйте ngrok:
# 1. Установите ngrok: https://ngrok.com/download
# 2. Запустите: ngrok http 5000
# 3. Укажите: FAL_WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
```

6. Create a `.env.local` file in the `frontend` directory with the following variables:
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
REACT_APP_WS_BASE_URL=http://localhost:5000
```

**⚠️ Important:** Create `frontend/.env.local` manually:
```bash
# Windows (PowerShell)
cd frontend
echo "REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key" > .env.local
echo "REACT_APP_WS_BASE_URL=http://localhost:5000" >> .env.local

# Linux/Mac
cd frontend
cat > .env.local << EOF
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
REACT_APP_WS_BASE_URL=http://localhost:5000
EOF
```

### Running the Application

1. Apply database migrations:
```bash
# Windows
.\venv\Scripts\Activate.ps1
flask --app "backend.app:create_app()" db upgrade

# Linux/Mac
source venv/bin/activate
flask --app "backend.app:create_app()" db upgrade
```

2. Start the backend with WebSocket support:
```bash
# ⚠️ IMPORTANT: Use run_dev.py, NOT flask run!
# flask run doesn't support WebSocket connections

# Windows
.\venv\Scripts\Activate.ps1
python run_dev.py

# Linux/Mac
source venv/bin/activate
python run_dev.py
```

3. In a separate terminal, start the frontend:
```bash
cd frontend
npm start
```

4. Open the application in your browser:
```
http://localhost:3000
```

### Verifying WebSocket Connection

After starting both backend and frontend:

1. Open browser Developer Console (F12)
2. Navigate to Dashboard page
3. Look for WebSocket connection logs:
   ```
   [WebSocket] Initializing connection to: http://localhost:5000 for user: XXX
   [WebSocket] Connected. Socket ID: YYYY
   [WebSocket] Joined room: user_XXX
   ```
4. Start an image generation
5. When generation completes, you should see:
   ```
   [WebSocket] Received image_updated event: {...}
   ```
6. The image should appear automatically without page refresh

**Troubleshooting:**
- If WebSocket fails to connect, check:
  - Backend is running via `python run_dev.py` (NOT `flask run`)
  - `frontend/.env.local` exists with `REACT_APP_WS_BASE_URL=http://localhost:5000`
  - No firewall blocking port 5000
  - Browser console for CORS errors
  - Backend logs for connection attempts

## Project Structure

```
MyPhotoAI/
├── backend/            # Backend code (Flask)
├── frontend/           # Frontend code (React)
│   ├── public/         # Static files
│   ├── src/            # React source code
│   │   ├── components/ # Reusable components
│   │   ├── context/    # React contexts
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   ├── App.js      # Root component
│   │   └── index.js    # Entry point
└── requirements.txt    # Python dependencies
```

## Design Updates

The latest update included:

1. Dark theme with bright accents and improved contrast
2. Modern design system with CSS variables for colors, shadows, border-radius, etc.
3. Styled components: 
   - Navigation bar with animated elements
   - Modern authentication forms
   - Pricing cards with discounts
   - Home page with a hero section
   - AI image generation dashboard
4. Modern footer with gradients and animated icons
5. Improved typography and responsiveness
6. Refined authentication process with loading animations

## Local Preview Without External Service Setup

To preview the appearance and navigate between pages without full setup:

1. Start the backend with minimal settings:
```bash
flask --app "backend.app:create_app()" run
```

2. Start the frontend:
```bash
cd frontend
npm start
```

This allows viewing the UI and testing basic functionality (registration, login), but without the ability to create models and generate images.