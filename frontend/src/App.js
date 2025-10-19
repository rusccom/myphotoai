import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Страницы
import HomePage from './pages/HomePage';
import PricePage from './pages/PricePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateModelPage from './pages/CreateModelPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import AccountPage from './pages/AccountPage';
import BillingPage from './pages/BillingPage';
import TermsAndPrivacyPage from './pages/TermsAndPrivacyPage';

// Импортируем CSS модуль для App
import styles from './App.module.css';

// Компонент 404
const NotFound = () => (
  <div style={{
    textAlign: 'center',
    padding: '4rem 1rem',
    maxWidth: '600px',
    margin: '0 auto'
  }}>
    <h1 style={{ fontSize: '5rem', margin: '0', color: 'var(--primary)' }}>404</h1>
    <h2 style={{ 
      margin: '0.5rem 0 2rem', 
      background: 'linear-gradient(to right, var(--primary), var(--accent))',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }}>
      Страница не найдена
    </h2>
    <p style={{ color: 'var(--gray)', marginBottom: '2rem' }}>
      Запрашиваемая страница не существует или была перемещена.
    </p>
    <Link to="/" style={{
      display: 'inline-block',
      padding: '0.75rem 1.5rem',
      background: 'linear-gradient(to right, var(--primary), var(--accent))',
      color: 'white',
      borderRadius: 'var(--radius-md)',
      textDecoration: 'none',
      fontWeight: '500',
      boxShadow: 'var(--shadow-md)'
    }}>
      Вернуться на главную
    </Link>
  </div>
);

// Компонент прелоадера
const LoadingScreen = () => (
  <div className={styles.loadingOverlay}>
    <div className={styles.loader}></div>
  </div>
);

// AppContent now only renders Notification and Routes inside mainContent
function AppContent() {
  const { isLoading } = useAuth();

  return (
    <Layout>
      <ScrollToTop />
      <main className={styles.mainContent}>
        {isLoading ? (
          <LoadingScreen />
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms-and-privacy" element={<TermsAndPrivacyPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel" element={<PaymentCancelPage />} />
            <Route
              path="/dashboard"
              element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
            />
            <Route
              path="/create-model"
              element={<ProtectedRoute><CreateModelPage /></ProtectedRoute>}
            />
            <Route
              path="/account"
              element={<ProtectedRoute><AccountPage /></ProtectedRoute>}
            />
            <Route
              path="/billing"
              element={<ProtectedRoute><BillingPage /></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
    </Layout>
  );
}

// App now simply renders AppContent. AuthProvider is in index.js
function App() {
  return <AppContent />;
}

export default App;
