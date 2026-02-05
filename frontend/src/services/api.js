// frontend/src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

/**
 * Типы генерации
 */
export const GENERATION_TYPES = {
    MODEL_PHOTO: 'model_photo',
    TEXT_TO_IMAGE: 'text_to_image',
    UPSCALE: 'upscale',
    TRY_ON: 'try_on',
    EDIT_PHOTO: 'edit_photo',
};

/**
 * Общая функция для выполнения запросов
 */
export async function fetchApi(endpoint, options = {}, isFormData = false) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = {
        'Accept': 'application/json',
    };
    
    if (!isFormData) {
        defaultHeaders['Content-Type'] = 'application/json';
    }
    
    const config = {
        method: 'GET',
        headers: defaultHeaders,
        credentials: 'include',
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    if (config.body && typeof config.body === 'object' && !isFormData) {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { error: `Invalid JSON response (status: ${response.status})` };
        }

        if (!response.ok) {
            const error = new Error(data?.error || `HTTP error! status: ${response.status}`);
            error.response = response;
            error.data = data;
            throw error;
        }
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error.data ? error : new Error(error.message || 'Network error');
    }
}

// ============================================
// ГЕНЕРАЦИЯ - УНИВЕРСАЛЬНЫЙ API
// ============================================

/**
 * Универсальная функция для запуска любого типа генерации.
 * 
 * @param {string} type - Тип генерации из GENERATION_TYPES
 * @param {Object|FormData} data - Данные для генерации
 * @param {boolean} isFormData - true если передаем FormData
 * @returns {Promise<{images: Array, new_balance: number}>}
 */
export const startGeneration = async (type, data, isFormData = false) => {
    if (isFormData) {
        data.append('type', type);
        return fetchApi('/generation/start', {
            method: 'POST',
            body: data,
        }, true);
    } else {
        return fetchApi('/generation/start', {
            method: 'POST',
            body: { ...data, type },
        });
    }
};

/**
 * История генераций
 */
export const getGenerationHistory = (page = 1, perPage = 20) => {
    return fetchApi(`/generation/history?page=${page}&per_page=${perPage}`);
};

/**
 * Стоимость операций
 */
export const getCosts = () => {
    return fetchApi('/generation/costs');
};

// ============================================
// АУТЕНТИФИКАЦИЯ
// ============================================

export const registerUser = (email, password) => {
    return fetchApi('/auth/register', {
        method: 'POST',
        body: { email, password },
    });
};

export const loginUser = (email, password) => {
    return fetchApi('/auth/login', {
        method: 'POST',
        body: { email, password },
    });
};

export const logoutUser = () => {
    return fetchApi('/auth/logout', { method: 'POST' });
};

export const checkAuthStatus = () => {
    return fetchApi('/auth/status');
};

export const initiateGoogleLogin = () => {
    return fetchApi('/auth/google/login');
};

export const changePassword = (currentPassword, newPassword) => {
    return fetchApi('/auth/change-password', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
    });
};

// ============================================
// МОДЕЛИ
// ============================================

export const createModel = (formData) => {
    return fetchApi('/model/create', {
        method: 'POST',
        body: formData,
    }, true);
};

export const listModels = () => {
    return fetchApi('/model/list');
};

export const syncModels = () => {
    return fetchApi('/model/sync', { method: 'POST' });
};

// ============================================
// ПЛАТЕЖИ
// ============================================

export const createCheckoutSession = (amountUsd) => {
    return fetchApi('/payment/create-checkout-session', {
        method: 'POST',
        body: { amount_usd: amountUsd },
    });
};

export const quotePoints = (amountUsd) => {
    return fetchApi('/payment/quote', {
        method: 'POST',
        body: { amount_usd: amountUsd },
    });
};

// ============================================
// ПРЕСЕТЫ
// ============================================

/**
 * Получить список категорий пресетов
 */
export const getPresetCategories = () => {
    return fetchApi('/preset/categories');
};

/**
 * Получить список пресетов
 * @param {number} categoryId - опциональный ID категории для фильтрации
 */
export const getPresets = (categoryId) => {
    const params = categoryId ? `?category_id=${categoryId}` : '';
    return fetchApi(`/preset/list${params}`);
};
