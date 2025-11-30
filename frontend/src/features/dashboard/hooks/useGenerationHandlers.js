/**
 * Хук для обработки генераций в Dashboard.
 * Использует универсальный API startGeneration.
 */
import { useCallback } from 'react';
import { useGeneration } from '../../../hooks/useGeneration';
import { GENERATION_TYPES } from '../../../services/api';

export const useGenerationHandlers = (
    models,
    selectedModelId,
    updateUser,
    setPendingGenerations
) => {
    const generation = useGeneration(updateUser, setPendingGenerations);

    // Model Photo - с валидацией модели
    const handleModelPhotoSubmit = useCallback(async (params) => {
        const selectedModel = models.find(m => m.id === selectedModelId);

        if (!params.prompt?.trim()) {
            return { success: false, error: 'Please enter a prompt.' };
        }

        if (!selectedModelId || !selectedModel || selectedModel.status !== 'ready') {
            return { success: false, error: 'Please select a ready model.' };
        }

        return generation.submitModelPhoto(params, { aspectRatio: params.aspectRatio });
    }, [models, selectedModelId, generation]);

    // Text to Image
    const handleTextToImageSubmit = useCallback(async (params) => {
        return generation.submitTextToImage(params, { aspectRatio: params.aspectRatio });
    }, [generation]);

    // Upscale
    const handleUpscaleSubmit = useCallback(async (formData, galleryImage) => {
        const aspectRatio = galleryImage?.aspect_ratio || '1:1';
        return generation.submitUpscale(formData, { aspectRatio });
    }, [generation]);

    // Clothing Try-On
    const handleClothingTryOnSubmit = useCallback(async (formData, aspectRatio) => {
        return generation.submitTryOn(formData, { aspectRatio: aspectRatio || '3:4' });
    }, [generation]);

    // Nano Banana
    const handleNanoBananaSubmit = useCallback(async (formData) => {
        return generation.submitNanoBanana(formData);
    }, [generation]);

    return {
        // Nano Banana
        isSubmittingNanoBanana: generation.isSubmittingNanoBanana,
        nanoBananaError: generation.nanoBananaError,
        handleNanoBananaSubmit,

        // Model Photo
        isSubmitting: generation.isSubmittingModelPhoto,
        error: generation.modelPhotoError,
        handleModelPhotoSubmit,

        // Text to Image
        isSubmittingText: generation.isSubmittingTextToImage,
        textError: generation.textToImageError,
        handleTextToImageSubmit,

        // Upscale
        isSubmittingUpscale: generation.isSubmittingUpscale,
        upscaleError: generation.upscaleError,
        handleUpscaleSubmit,

        // Clothing Try-On
        isSubmittingClothingTryOn: generation.isSubmittingTryOn,
        clothingTryOnError: generation.tryOnError,
        handleClothingTryOnSubmit,
        
        // Универсальный доступ
        generation,
        TYPES: GENERATION_TYPES,
    };
};
