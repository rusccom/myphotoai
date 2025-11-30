/**
 * Универсальный хук для всех типов генерации.
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { startGeneration, GENERATION_TYPES } from '../services/api';
import styles from '../pages/DashboardPage.module.css';

/**
 * Конфигурация типов генерации
 */
const CONFIG = {
    [GENERATION_TYPES.MODEL_PHOTO]: {
        defaultAspectRatio: '1:1',
        isFormData: false,
    },
    [GENERATION_TYPES.TEXT_TO_IMAGE]: {
        defaultAspectRatio: '16:9',
        isFormData: false,
    },
    [GENERATION_TYPES.UPSCALE]: {
        defaultAspectRatio: '1:1',
        isFormData: true,
    },
    [GENERATION_TYPES.TRY_ON]: {
        defaultAspectRatio: '3:4',
        isFormData: true,
    },
    [GENERATION_TYPES.NANO_BANANA]: {
        defaultAspectRatio: 'auto',
        isFormData: true,
    },
};

const createPaymentError = () => (
    <div className={styles.paymentRequiredMessage}>
        <div>You have insufficient funds.</div>
        <Link to="/billing" className={styles.inlineLink}>Add Credits?</Link>
    </div>
);

/**
 * Универсальный хук для генерации
 */
export const useGeneration = (updateUser, setPendingGenerations) => {
    const [states, setStates] = useState({});

    const getState = useCallback((type) => ({
        isSubmitting: states[type]?.isSubmitting || false,
        error: states[type]?.error || null,
    }), [states]);

    const setState = useCallback((type, updates) => {
        setStates(prev => ({
            ...prev,
            [type]: { ...prev[type], ...updates }
        }));
    }, []);

    const clearError = useCallback((type) => {
        setState(type, { error: null });
    }, [setState]);

    /**
     * Универсальный submit
     */
    const submit = useCallback(async (type, data, options = {}) => {
        const config = CONFIG[type];
        if (!config) {
            return { success: false, error: 'Unknown generation type' };
        }

        setState(type, { isSubmitting: true, error: null });

        try {
            const response = await startGeneration(type, data, config.isFormData);

            if (response.images?.length > 0) {
                const aspectRatio = options.aspectRatio || config.defaultAspectRatio;
                const imagesWithAspect = response.images.map(img => ({
                    ...img,
                    aspect_ratio: img.aspect_ratio || aspectRatio,
                    generation_type: type,
                }));

                setPendingGenerations(prev => [...imagesWithAspect, ...prev]);

                if (response.new_balance !== undefined && updateUser) {
                    updateUser({ balance_points: response.new_balance });
                }
            }

            return { success: true, images: response.images };

        } catch (err) {
            const error = err.response?.status === 402 
                ? createPaymentError()
                : err.data?.error || err.message || 'Generation failed';

            setState(type, { error });
            return { success: false, error };

        } finally {
            setState(type, { isSubmitting: false });
        }
    }, [setState, setPendingGenerations, updateUser]);

    // Хелперы для конкретных типов
    const submitModelPhoto = useCallback((data, options) => 
        submit(GENERATION_TYPES.MODEL_PHOTO, data, options), [submit]);
    
    const submitTextToImage = useCallback((data, options) => 
        submit(GENERATION_TYPES.TEXT_TO_IMAGE, { ...data, aiModelId: null }, options), [submit]);
    
    const submitUpscale = useCallback((formData, options) => 
        submit(GENERATION_TYPES.UPSCALE, formData, options), [submit]);
    
    const submitTryOn = useCallback((formData, options) => 
        submit(GENERATION_TYPES.TRY_ON, formData, options), [submit]);
    
    const submitNanoBanana = useCallback((formData, options) => 
        submit(GENERATION_TYPES.NANO_BANANA, formData, options), [submit]);

    return {
        submit,
        getState,
        clearError,
        TYPES: GENERATION_TYPES,
        
        // Хелперы
        submitModelPhoto,
        submitTextToImage,
        submitUpscale,
        submitTryOn,
        submitNanoBanana,
        
        // Состояния для обратной совместимости
        isSubmittingModelPhoto: states[GENERATION_TYPES.MODEL_PHOTO]?.isSubmitting || false,
        modelPhotoError: states[GENERATION_TYPES.MODEL_PHOTO]?.error || null,
        
        isSubmittingTextToImage: states[GENERATION_TYPES.TEXT_TO_IMAGE]?.isSubmitting || false,
        textToImageError: states[GENERATION_TYPES.TEXT_TO_IMAGE]?.error || null,
        
        isSubmittingUpscale: states[GENERATION_TYPES.UPSCALE]?.isSubmitting || false,
        upscaleError: states[GENERATION_TYPES.UPSCALE]?.error || null,
        
        isSubmittingTryOn: states[GENERATION_TYPES.TRY_ON]?.isSubmitting || false,
        tryOnError: states[GENERATION_TYPES.TRY_ON]?.error || null,
        
        isSubmittingNanoBanana: states[GENERATION_TYPES.NANO_BANANA]?.isSubmitting || false,
        nanoBananaError: states[GENERATION_TYPES.NANO_BANANA]?.error || null,
    };
};

export default useGeneration;
