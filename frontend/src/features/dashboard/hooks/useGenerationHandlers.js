import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    startBaseImageGeneration,
    startLoraImageGeneration,
    startImageUpscale,
    startTryOnGeneration,
    startNanoBananaGeneration,
} from '../../../services/api';
import styles from '../../../pages/DashboardPage.module.css';

const createPaymentRequiredMessage = (errorMessage) => {
    return (
        <div className={styles.paymentRequiredMessage}>
            <div>You have insufficient funds.</div>
            <div>
                <Link to="/billing" className={styles.inlineLink}>Add Credits?</Link>
            </div>
        </div>
    );
};

export const useGenerationHandlers = (
    models, 
    selectedModelId,
    updateUser,
    setPendingGenerations
) => {
    const [isSubmittingNanoBanana, setIsSubmittingNanoBanana] = useState(false);
    const [nanoBananaError, setNanoBananaError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [isSubmittingText, setIsSubmittingText] = useState(false);
    const [textError, setTextError] = useState(null);
    const [isSubmittingUpscale, setIsSubmittingUpscale] = useState(false);
    const [upscaleError, setUpscaleError] = useState(null);
    const [isSubmittingClothingTryOn, setIsSubmittingClothingTryOn] = useState(false);
    const [clothingTryOnError, setClothingTryOnError] = useState(null);

    const prepareImagesForPendingState = (imageList, formSelectedAspectRatio) => {
        return imageList.map(imgFromBackend => ({
            ...imgFromBackend,
            aspect_ratio: imgFromBackend.aspect_ratio || formSelectedAspectRatio
        }));
    };

    const handleNanoBananaSubmit = async (formData) => {
        setIsSubmittingNanoBanana(true);
        setNanoBananaError(null);
        
        try {
            const response = await startNanoBananaGeneration(formData);
            
            if (response.images && Array.isArray(response.images)) {
                setPendingGenerations(prev => [...response.images, ...prev]);
                
                if (response.new_balance !== undefined) {
                    updateUser({ balance_points: response.new_balance });
                }
            }
        } catch (err) {
            let displayError = 'Generation failed. Please try again.';
            if (err.response?.status === 402 && err.data?.error) {
                displayError = createPaymentRequiredMessage(err.data.error);
            } else if (err.data?.error) {
                displayError = err.data.error;
            }
            setNanoBananaError(displayError);
        } finally {
            setIsSubmittingNanoBanana(false);
        }
    };

    const handleModelPhotoSubmit = async (params) => {
        setIsSubmitting(true);
        setError(null);
        
        const selectedModel = models.find(m => m.id === selectedModelId);
        
        if (!params.prompt.trim()) {
            setError('Please enter a prompt.');
            setIsSubmitting(false);
            return;
        }
        if (!selectedModelId || !selectedModel || selectedModel.status !== 'ready') {
            setError('Please select a ready model.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await startLoraImageGeneration(params);

            if (Array.isArray(response.images) && response.images.length > 0) {
                const imagesWithDisplayInfo = prepareImagesForPendingState(
                    response.images, 
                    params.aspectRatio
                );
                setPendingGenerations(prev => [...imagesWithDisplayInfo, ...prev]);
                
                if (typeof response.new_balance === 'number' && updateUser) {
                    updateUser({ balance_points: response.new_balance });
                }
            }
        } catch (err) {
            let displayError = err.message || 'Failed to start generation.';
            if (err.response?.status === 402 && err.data?.error) {
                displayError = createPaymentRequiredMessage(err.data.error);
            } else if (err.data?.error) {
                displayError = err.data.error;
            }
            setError(displayError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTextToImageSubmit = async (params) => {
        setIsSubmittingText(true);
        setTextError(null);
        
        try {
            const response = await startBaseImageGeneration(params);

            if (Array.isArray(response.images) && response.images.length > 0) {
                const imagesWithDisplayInfo = prepareImagesForPendingState(
                    response.images, 
                    params.aspectRatio
                );
                setPendingGenerations(prev => [...imagesWithDisplayInfo, ...prev]);
                
                if (typeof response.new_balance === 'number' && updateUser) {
                    updateUser({ balance_points: response.new_balance });
                }
            }
        } catch (err) {
            let displayError = err.message || 'Failed to start generation.';
            if (err.response?.status === 402 && err.data?.error) {
                displayError = createPaymentRequiredMessage(err.data.error);
            } else if (err.data?.error) {
                displayError = err.data.error;
            }
            setTextError(displayError);
        } finally {
            setIsSubmittingText(false);
        }
    };

    const handleUpscaleSubmit = async (formData, galleryImage) => {
        setIsSubmittingUpscale(true);
        setUpscaleError(null);
        
        try {
            const response = await startImageUpscale(formData);

            if (Array.isArray(response.images) && response.images.length > 0) {
                const aspectRatioForUpscale = galleryImage?.aspect_ratio || '1:1';
                const imagesWithDisplayInfo = prepareImagesForPendingState(
                    response.images, 
                    aspectRatioForUpscale
                );
                setPendingGenerations(prev => [...imagesWithDisplayInfo, ...prev]);
                
                if (typeof response.new_balance === 'number' && updateUser) {
                    updateUser({ balance_points: response.new_balance });
                }
            }
        } catch (err) {
            let displayError = err.message || 'Failed to start upscale.';
            if (err.response?.status === 402 && err.data?.error) {
                displayError = createPaymentRequiredMessage(err.data.error);
            } else if (err.data?.error) {
                displayError = err.data.error;
            }
            setUpscaleError(displayError);
        } finally {
            setIsSubmittingUpscale(false);
        }
    };

    const handleClothingTryOnSubmit = async (formData, aspectRatio) => {
        setIsSubmittingClothingTryOn(true);
        setClothingTryOnError(null);
        
        try {
            const response = await startTryOnGeneration(formData);

            if (Array.isArray(response.images) && response.images.length > 0) {
                const aspectRatioForPending = aspectRatio || '3:4';
                const imagesWithDisplayInfo = prepareImagesForPendingState(
                    response.images, 
                    aspectRatioForPending
                );
                
                const finalImagesToPending = imagesWithDisplayInfo.map(img => ({
                    ...img,
                    generation_type: 'try_on'
                }));

                setPendingGenerations(prev => [...finalImagesToPending, ...prev]);
                
                if (typeof response.new_balance === 'number' && updateUser) {
                    updateUser({ balance_points: response.new_balance });
                }
            }
        } catch (err) {
            let displayError = err.message || 'Failed to start try-on.';
            if (err.response?.status === 402 && err.data?.error) {
                displayError = createPaymentRequiredMessage(err.data.error);
            } else if (err.data?.error) {
                displayError = err.data.error;
            }
            setClothingTryOnError(displayError);
        } finally {
            setIsSubmittingClothingTryOn(false);
        }
    };

    return {
        // Nano Banana
        isSubmittingNanoBanana,
        nanoBananaError,
        handleNanoBananaSubmit,
        
        // Model Photo
        isSubmitting,
        error,
        handleModelPhotoSubmit,
        
        // Text to Image
        isSubmittingText,
        textError,
        handleTextToImageSubmit,
        
        // Upscale
        isSubmittingUpscale,
        upscaleError,
        handleUpscaleSubmit,
        
        // Clothing Try-On
        isSubmittingClothingTryOn,
        clothingTryOnError,
        handleClothingTryOnSubmit,
    };
};

