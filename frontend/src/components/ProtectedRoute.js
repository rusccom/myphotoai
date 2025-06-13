import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation(); // Сохраняем текущий путь для возможного редиректа обратно

    // Если проверка статуса еще идет, показываем заглушку или ничего не рендерим
    if (isLoading) {
        // Можно вернуть спиннер или просто null
        return <div>Loading authentication status...</div>;
    }

    // Если проверка завершена и пользователь не аутентифицирован,
    // перенаправляем на страницу входа, сохраняя исходный путь в state
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Если пользователь аутентифицирован, рендерим дочерний компонент
    return children;
}

export default ProtectedRoute; 