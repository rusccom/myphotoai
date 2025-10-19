import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    registerUser,
    loginUser,
    logoutUser,
    checkAuthStatus,
    listModels,
    fetchApi,
    initiateGoogleLogin
} from '../services/api';

// 1. Создаем контекст
const AuthContext = createContext(null);

// 2. Создаем компонент Provider
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Хранит данные пользователя { id, email, ... }
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Флаг аутентификации
    const [isLoading, setIsLoading] = useState(true); // Изначально загружаемся, чтобы проверить статус
    const [models, setModels] = useState([]); // Состояние для списка моделей
    const [modelsLoading, setModelsLoading] = useState(false);
    const navigate = useNavigate();

    // Функция для проверки статуса и загрузки моделей
    const checkStatusAndLoadModels = useCallback(async () => {
        console.log("AuthProvider: Checking auth status...");
        setIsLoading(true);
        setModelsLoading(true);
        try {
            const data = await checkAuthStatus();
            if (data.authenticated) {
                console.log("AuthProvider: User authenticated, loading models...");
                setUser(data.user);
                setIsAuthenticated(true);
                // Загружаем модели после подтверждения аутентификации
                try {
                    const modelsData = await listModels();
                    setModels(modelsData); 
                    console.log("AuthProvider: Models loaded:", modelsData);
                } catch (modelsError) {
                    console.error("AuthProvider: Failed to load models", modelsError);
                    setModels([]); // Очищаем модели в случае ошибки
                }
            } else {
                console.log("AuthProvider: User is not authenticated.");
                setUser(null);
                setIsAuthenticated(false);
                setModels([]); // Очищаем модели при выходе
            }
        } catch (error) {
            console.error("AuthProvider: Failed to check auth status", error);
            setUser(null);
            setIsAuthenticated(false);
            setModels([]); // Очищаем при ошибке
        } finally {
            setIsLoading(false);
            setModelsLoading(false);
        }
    }, []);

    // Проверяем статус при первой загрузке
    useEffect(() => {
        checkStatusAndLoadModels();
    }, [checkStatusAndLoadModels]);

    // Функции, которые будут доступны через контекст
    const login = async (email, password) => {
        try {
            const data = await loginUser(email, password);
            console.log("AuthContext: Login success, setting user:", data);
            setUser(data.user); // data.user теперь содержит только данные User
            setIsAuthenticated(true);
            // Загружаем модели после входа
            setModelsLoading(true);
            try {
                const modelsData = await listModels();
                setModels(modelsData);
            } catch (modelsError) {
                 console.error("AuthProvider: Failed to load models after login", modelsError);
                 setModels([]);
            } finally {
                setModelsLoading(false);
            }
        } catch (error) {
            console.error("AuthContext: Login error:", error);
            setIsAuthenticated(false);
            setUser(null);
            setModels([]);
            throw error; // Передаем ошибку для обработки в LoginPage
        }
    };

    const register = async (email, password) => {
         try {
            const data = await registerUser(email, password);
            console.log("AuthContext: Register success, setting user:", data);
            setUser(data.user);
            setIsAuthenticated(true);
            setModels([]); // Новых моделей еще нет
        } catch (error) {
            console.error("AuthContext: Register error:", error);
            setIsAuthenticated(false);
            setUser(null);
            setModels([]);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await logoutUser();
            setUser(null);
            setIsAuthenticated(false);
            setModels([]); // Очищаем модели при выходе
        } catch (error) {
            console.error("AuthContext: Logout error:", error);
            // Даже если ошибка, сбрасываем состояние
            setUser(null);
            setIsAuthenticated(false);
            setModels([]);
        }
    };

    const loginWithGoogle = async () => {
        try {
            // Получаем authorization URL от бэкенда
            const data = await initiateGoogleLogin();
            const authUrl = data.authorization_url;
            
            // Открываем Google OAuth в том же окне
            window.location.href = authUrl;
            
            // После редиректа пользователь вернется на /dashboard
            // и checkStatusAndLoadModels() обновит состояние
        } catch (error) {
            console.error("AuthContext: Google login error:", error);
            throw error;
        }
    };

    // Функция для обновления списка моделей (например, после создания новой)
    const refreshModels = useCallback(async () => {
        if (!isAuthenticated) return; // Не обновляем, если не авторизован
        setModelsLoading(true);
        try {
            const modelsData = await listModels();
            setModels(modelsData);
        } catch (error) {
            console.error("AuthProvider: Failed to refresh models", error);
        } finally {
            setModelsLoading(false);
        }
    }, [isAuthenticated]);

    // --- НОВОЕ: Функция для частичного обновления данных пользователя --- 
    const updateUser = useCallback((updatedData) => {
        setUser(prevUser => {
            if (!prevUser) return null; // Если пользователя нет, ничего не делаем
            // Обновляем только переданные поля
            const newUser = { ...prevUser, ...updatedData };
            console.log("AuthContext: Updating user data", updatedData, "New user state:", newUser);
            return newUser;
        });
    }, []);
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    // Значение, передаваемое через Provider
    const value = {
        user,
        models, // Предоставляем список моделей
        modelsLoading, // И статус их загрузки
        refreshModels, // И функцию для обновления
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        loginWithGoogle, // <-- Добавляем Google OAuth функцию
        checkStatus: checkStatusAndLoadModels, // Переименовываем для ясности
        updateUser, // <-- Добавляем новую функцию в контекст
        api: fetchApi // <-- Добавляем fetchApi под ключом api
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// 3. Создаем хук для удобного использования контекста
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    if (context === null) {
        return {
            user: null,
            isAuthenticated: false,
            isLoading: true,
            login: async () => {},
            register: async () => {},
            logout: async () => {},
            loginWithGoogle: async () => {},
            checkStatus: async () => {},
            updateUser: () => {},
            api: async () => {} // <-- Добавляем заглушку для api
        };
    }
    return context;
}; 