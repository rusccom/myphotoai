# Scenaria - Personalized AI Model Creation and Generation Service

A modern web application for creating AI models based on your photos and generating images featuring you in various styles and scenarios.

## Features

- 🧠 Create a personalized AI model based on your photos
- 🖼️ Generate photorealistic images using text prompts
- 🎬 Create videos based on generated images (in development)
- 💰 Flexible pricing plans and subscription system
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
cd Scenaria
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
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
BFL_API_KEY=your_bfl_api_key
CORS_ORIGINS=http://localhost:3000
```

6. Create a `.env` file in the `frontend` directory with the following variables:
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### Running the Application

1. Apply database migrations:
```bash
flask --app "backend.app:create_app()" db upgrade
```

2. Start the backend:
```bash
flask --app "backend.app:create_app()" run
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

## Project Structure

```
Scenaria/
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