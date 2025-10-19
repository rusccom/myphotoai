// frontend/src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// Общая функция для выполнения запросов
export async function fetchApi(endpoint, options = {}, isFormData = false) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = {
        // Добавляем Accept, чтобы Flask знал, что мы ожидаем JSON
        'Accept': 'application/json',
    };
    // НЕ устанавливаем Content-Type для FormData, браузер сделает это сам с правильным boundary
    if (!isFormData) {
        defaultHeaders['Content-Type'] = 'application/json';
    }
    const defaultOptions = {
        method: 'GET',
        headers: defaultHeaders,
        // Включаем передачу cookies для управления сессиями Flask-Login
        credentials: 'include'
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    // Если тело есть, это объект и НЕ FormData, преобразуем в JSON
    if (config.body && typeof config.body === 'object' && !isFormData) {
        config.body = JSON.stringify(config.body);
    }
    // Если это FormData, тело уже готово (config.body будет объектом FormData)

    try {
        const response = await fetch(url, config);
        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { error: `Invalid JSON response from server (status: ${response.status})` };
        }

        if (!response.ok) {
            const errorMessage = data?.error || `HTTP error! status: ${response.status}`;
            const error = new Error(errorMessage);
            error.response = response;
            error.data = data;
            throw error;
        }
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error.data ? error : new Error(error.message || 'Network or other error');
    }
}

// Функции для конкретных эндпоинтов аутентификации
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
    return fetchApi('/auth/logout', {
        method: 'POST',
        // Тело не нужно
    });
};

export const checkAuthStatus = () => {
    return fetchApi('/auth/status'); // Больше не возвращает модель
};

// Google OAuth functions
export const initiateGoogleLogin = () => {
    return fetchApi('/auth/google/login');
};

// Новая функция для смены пароля
export const changePassword = (currentPassword, newPassword) => {
    return fetchApi('/auth/change-password', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
    });
};

// Функция для создания модели (отправка FormData)
export const createModel = (formData) => {
    return fetchApi('/model/create', {
        method: 'POST',
        body: formData,
        // Headers не нужны для FormData
    }, true);
};

// Новая функция для получения списка моделей
export const listModels = () => {
    return fetchApi('/model/list'); // GET запрос
};

// Новая функция для синхронизации моделей
export const syncModels = () => {
    return fetchApi('/model/sync', {
        method: 'POST', // Используем POST
        // Тело не нужно
    });
};

// Старая startImageGeneration теперь будет для базовой генерации
export const startBaseImageGeneration = (params) => {
    // params = { prompt, aspectRatio, num_images, seed?, style?, cameraAngle?, emotion? }
    // Убедимся, что aiModelId не передается или равен null
    return fetchApi('/generation/start', { // Этот эндпоинт теперь только для базовой генерации
        method: 'POST',
        body: { ...params, aiModelId: null }, 
    });
};

// НОВАЯ функция для генерации с LoRA моделью
export const startLoraImageGeneration = (params) => {
    // params = { prompt, aiModelId, image_size, num_images, finetuneStrength, seed?, style?, cameraAngle?, emotion? }
    return fetchApi('/generation/lora-generate', { // Новый эндпоинт
        method: 'POST',
        body: params, 
    });
};

export const getGenerationHistory = (page = 1, perPage = 20) => {
    return fetchApi(`/generation/history?page=${page}&per_page=${perPage}`);
};

// NEW: Function to start image upscale
export const startImageUpscale = (formData) => {
    // formData should contain the 'image' file and any other parameters like 'upscale_factor'
    return fetchApi('/generation/upscale', {
        method: 'POST',
        body: formData, 
        // Headers are not needed for FormData, browser sets it with boundary
    }, true); // <-- Set isFormData to true
};

// Функция для создания сессии Stripe Checkout
export const createCheckoutSession = (priceId) => {
    return fetchApi('/payment/create-checkout-session', {
        method: 'POST',
        body: { priceId }, 
    });
};

// NEW: Function to start Virtual Try-On
export const startTryOnGeneration = (formData) => {
    // formData should contain 'model_image', 'garment_image', and other optional try-on parameters
    return fetchApi('/generation/try-on', {
        method: 'POST',
        body: formData, 
        // Headers are not needed for FormData, browser sets it with boundary
    }, true); // <-- Set isFormData to true
};

// NEW: Function to start Nano Banana editing
export const startNanoBananaGeneration = (formData) => {
    // formData should contain 'image_urls' (multiple files), 'prompt', and other optional parameters
    return fetchApi('/generation/nano-banana', {
        method: 'POST',
        body: formData, 
        // Headers are not needed for FormData, browser sets it with boundary
    }, true); // <-- Set isFormData to true
};

// Удаляем эту функцию, т.к. startImageGeneration теперь общая
// export const startTextToImageGeneration = (params) => {
//     // params = { prompt, aspectRatio, num_images, seed? }
//     return fetchApi('/imageGenerate/generate', { // Используем новый эндпоинт
//         method: 'POST',
//         body: params,
//     });
// }; 

// NEW: Function to fetch generation costs
export const getCosts = async () => {
    return await fetchApi('/generation/costs');
};

// --- R2 URL Generation Functions (Server-Side) ---
// These functions are now handled by the backend by including the signed_url directly
// in the to_dict() methods of the models. They are kept here for reference but are not used.
// ... 