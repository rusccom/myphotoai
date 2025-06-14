import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Добавляем Link И useLocation
import { useAuth } from '../context/AuthContext';
import {
    startBaseImageGeneration, // Новый импорт для базовой генерации
    startLoraImageGeneration, // Новый импорт для LoRA генерации
    getGenerationResult,
    getGenerationHistory,
    startImageUpscale, // <-- NEW: Import upscale function
    startTryOnGeneration, // <-- NEW: Import TryOn function
    // --- НОВЫЕ ИМПОРТЫ ДЛЯ R2 URL ---
    // getR2GeneratedImageUrl,
    // getR2ModelPreviewUrl,
    // --- КОНЕЦ НОВЫХ ИМПОРТОВ ---
} from '../services/api';
import styles from './DashboardPage.module.css'; // Импортируем CSS модуль
import ImageModal from '../components/ImageModal'; // <-- Импортируем новый компонент
import GenerationTimer from '../components/GenerationTimer'; // <-- Импортируем таймер
import NumImagesSelect from '../components/NumImagesSelect'; // <-- Импортируем новый компонент

// Options for selects (can be moved to constants)
const STYLE_OPTIONS = ['Photorealistic', 'Fashion Magazine', 'Vintage Film', 'Dreamy Look', 'Golden Hour', 'Minimalist Style', 'Noir Film', 'Cyberpunk City', 'Fantasy Art', 'Gothic Vibe', 'Pop Art'];
const CAMERA_OPTIONS = ['Close-up', 'Medium shot', 'Full shot', 'From above', 'From below'];
const EMOTION_OPTIONS = ['Smiling', 'Serious', 'Happy', 'Sad', 'Confident', 'Neutral', 'Scared'];
const LIGHT_OPTIONS = ['Studio Light', 'Ring Light', 'Neon Light', 'Dramatic Shadow'];

// Опции для Aspect Ratio (используются для ОБЕИХ форм генерации)
const ASPECT_RATIO_OPTIONS = ['3:4', '9:16', '1:1', '4:3', '16:9'];

// NEW: Карта для отображения кастомных названий на фронтенде
const ASPECT_RATIO_LABELS = {
    '3:4': '3:4 Portrait (Instagram)',
    '9:16': '9:16 (Stories/Reels)',
    '1:1': '1:1 Square',
    '4:3': '4:3 Landscape',
    '16:9': '16:9 Widescreen'
};

function DashboardPage() {
    // Берем модели и статус их загрузки из контекста
    const { user, models, modelsLoading, refreshModels, isLoading: authLoading, updateUser } = useAuth();
    const [selectedModelId, setSelectedModelId] = useState(null); // Наш ID модели (не BFL)
    const [activeTab, setActiveTab] = useState('Photo'); // Right panel tab
    const [leftPanelTab, setLeftPanelTab] = useState('modelPhoto'); // New state for left panel tabs

    // Generation form state
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState(''); // Сбрасываем стили по умолчанию
    const [cameraAngle, setCameraAngle] = useState('');
    const [emotion, setEmotion] = useState('');
    const [light, setLight] = useState('');
    const [finetuneStrength, setFinetuneStrength] = useState(1.1); // Новое состояние, default BFL = 1.2
    const [aspectRatio, setAspectRatio] = useState('3:4'); // Состояние aspectRatio теперь снова используется для формы Model Photo
    const [modelNumImages, setModelNumImages] = useState(2);

    // State for generations and errors
    const [pendingGenerations, setPendingGenerations] = useState([]);
    const [completedHistory, setCompletedHistory] = useState([]);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [historyPage, setHistoryPage] = useState(1);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);

    // --- Состояния для новой формы Text-to-Image ---
    const [textPrompt, setTextPrompt] = useState('');
    const [textAspectRatio, setTextAspectRatio] = useState('3:4'); // Для Text-to-Image
    const [textNumImages, setTextNumImages] = useState(2); // <-- Возвращаем дефолтное значение 2
    const [isSubmittingText, setIsSubmittingText] = useState(false);
    const [textError, setTextError] = useState(null);
    // --- Конец состояний для Text-to-Image ---

    // --- NEW State for Upscale --- 
    const [upscaleFile, setUpscaleFile] = useState(null);
    const [upscaleFactor, setUpscaleFactor] = useState(2); // Default 2x
    const [upscaleImageDimensions, setUpscaleImageDimensions] = useState({ width: null, height: null });
    const [upscaleImageAspectRatio, setUpscaleImageAspectRatio] = useState(null); // <-- НОВОЕ состояние для aspectRatio апскейла
    const [isUpscaleSizeValid, setIsUpscaleSizeValid] = useState(false); // <-- NEW: Track size validity
    const [isSubmittingUpscale, setIsSubmittingUpscale] = useState(false);
    const [upscaleError, setUpscaleError] = useState(null);
    const [upscalePreviewUrl, setUpscalePreviewUrl] = useState(null);
    const [upscaleImageFromGallery, setUpscaleImageFromGallery] = useState(null); // <-- NEW STATE
    // --- END State for Upscale --- 

    // --- State for Clothing Try-On (previously personFile, clothingFile) --- 
    const [tryOnModelFile, setTryOnModelFile] = useState(null); 
    const [tryOnModelPreview, setTryOnModelPreview] = useState(null);
    const [tryOnGarmentFile, setTryOnGarmentFile] = useState(null); 
    const [tryOnGarmentPreview, setTryOnGarmentPreview] = useState(null);
    const [tryOnInputModelAspectRatio, setTryOnInputModelAspectRatio] = useState(null); // For model image aspect ratio
    const [tryOnNumImages, setTryOnNumImages] = useState(2); // << ИЗМЕНЕНО НА 2
    const [isSubmittingClothingTryOn, setIsSubmittingClothingTryOn] = useState(false);
    const [clothingTryOnError, setClothingTryOnError] = useState(null);
    const [tryOnModelFromGallery, setTryOnModelFromGallery] = useState(null); // <-- НОВОЕ СОСТОЯНИЕ

    // --- НОВОЕ СОСТОЯНИЕ для модального окна --- 
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [actionsMenuOpenForId, setActionsMenuOpenForId] = useState(null); // <-- NEW STATE for actions menu

    const location = useLocation(); // <-- Get location object

    // NEW: Effect to handle hash changes for left panel tab
    useEffect(() => {
        const hash = location.hash.substring(1); // Remove #
        const validTabs = ['modelPhoto', 'descriptionGeneration', 'upscale', 'clothingTryOn', 'livePhoto']; 
        if (hash && validTabs.includes(hash)) {
            setLeftPanelTab(hash);
        } else {
            // Optionally set a default if hash is invalid or missing
             setLeftPanelTab('modelPhoto');
        }
        // Dependency: location.hash. When the hash changes, this effect re-runs.
    }, [location.hash]);

    // Авто-выбор первой ГОТОВОЙ модели при загрузке
    useEffect(() => {
        if (!modelsLoading && models && models.length > 0) {
            const firstReadyModel = models.find(m => m.status === 'ready');
            if (firstReadyModel && !selectedModelId) { // Выбираем только если еще не выбрано
                setSelectedModelId(firstReadyModel.id);
            }
        }
         // Сбрасываем выбор, если список моделей пуст
        if (!modelsLoading && (!models || models.length === 0)) {
             setSelectedModelId(null);
        }
    }, [models, modelsLoading, selectedModelId]);

    // Поллінг статуса МОДЕЛЕЙ (если нужно обновлять чаще, чем при checkStatus)
    useEffect(() => {
        const modelsInTraining = models.filter(m => m.status === 'training');
        if (modelsInTraining.length === 0) {
            return; // Нет моделей для проверки
        }

        console.log("Dashboard: Found models in training, starting status poll...");
        const intervalId = setInterval(() => {
            console.log("Dashboard: Refreshing models list...");
            refreshModels(); // Запрашиваем обновление списка моделей из контекста
        }, 15000); // Проверяем каждые 15 секунд

        return () => {
            console.log("Dashboard: Clearing model status poll interval.");
            clearInterval(intervalId);
        };
    }, [models, refreshModels]); // Зависит от списка моделей и функции обновления

    // Load history on mount
    const loadHistory = useCallback(async () => {
        setIsHistoryLoading(true);
        setHistoryPage(1); // Сбрасываем на первую страницу
        try {
            // Загружаем первую страницу
            const historyData = await getGenerationHistory(1);
            const history = historyData.images || [];
            console.log("Raw history from backend (page 1):", historyData);
            
            // Split history into pending and completed
            const pending = history.filter(img => img.status === 'Pending' || img.status === 'Running');
            const completed = history.filter(img => img.status === 'Ready' || img.status === 'Failed');
            
            console.log("Filtered pending:", pending);
            console.log("Filtered completed:", completed);
            
            setPendingGenerations(pending);
            setCompletedHistory(completed);
            setHasMoreHistory(historyData.has_next || false);
            setHistoryPage(historyData.current_page || 1);

        } catch (err) {
            console.error('Failed to load history:', err);
            setError(err.message || 'Failed to load generation history.');
        } finally {
            setIsHistoryLoading(false);
        }
    }, []);

    const loadMoreHistory = async () => {
        if (isHistoryLoadingMore || !hasMoreHistory) return;

        setIsHistoryLoadingMore(true);
        try {
            const nextPage = historyPage + 1;
            const historyData = await getGenerationHistory(nextPage);
            const newHistory = historyData.images || [];

            // Фильтруем дубликаты на всякий случай
            const newCompleted = newHistory.filter(img => 
                (img.status === 'Ready' || img.status === 'Failed') &&
                !completedHistory.some(existing => existing.id === img.id)
            );

            setCompletedHistory(prev => [...prev, ...newCompleted]);
            setHasMoreHistory(historyData.has_next || false);
            setHistoryPage(historyData.current_page || nextPage);
        } catch (err) {
            console.error('Failed to load more history:', err);
            // Можно установить отдельную ошибку для "load more"
        } finally {
            setIsHistoryLoadingMore(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Poll status of pending generations
    useEffect(() => {
        if (pendingGenerations.length === 0) return;

        const intervalId = setInterval(async () => {
            let updated = false;
            const newPending = [];
            const newlyCompleted = [];

            for (const img of pendingGenerations) {
                try {
                    const result = await getGenerationResult(img.id);
                    // Приводим статус от бэкенда к нижнему регистру для сравнения
                    const backendStatus = result.status ? result.status.toLowerCase() : null;

                    if (backendStatus === 'ready' || backendStatus === 'failed') {
                        newlyCompleted.push(result);
                        updated = true;
                    } else if (backendStatus === 'pending' || backendStatus === 'running') {
                         // If status updated (e.g., from Pending to Running), update state
                         // Сравниваем приведенный к нижнему регистру статус с текущим (который тоже должен быть в нижнем)
                         if (backendStatus !== img.status.toLowerCase()) { 
                             newPending.push({...img, status: backendStatus}); // Обновляем статус в объекте
                             updated = true;
                         } else {
                             newPending.push(img); // Status unchanged, keep old object
                         }
                    } else {
                        // 6в. Если БЭКЕНД вернул НЕОЖИДАННЫЙ статус (или null)
                        console.error(`!!! FRONTEND: Unexpected status received from backend for image ${img.id}: Actual status='${result.status}' (normalized: '${backendStatus}'). Setting to 'failed'. Full result:`, result);
                        console.warn(`Unexpected status for image ${img.id}: ${result.status}`);
                        newlyCompleted.push({ ...img, status: 'failed' });
                        updated = true;
                    }
                } catch (err) { // Error polling a specific image
                    console.error(`Failed to poll status for image ${img.id}:`, err);
                    newPending.push(img); // Keep in pending, try next time
                }
            }

            if (updated) {
                // Вместо простого добавления, мы "умно" обновим оба списка.
                // 1. Обновляем основной список завершенных.
                setCompletedHistory(prevCompleted => {
                    const newCompletedIds = new Set(newlyCompleted.map(img => img.id));
                    // Фильтруем старые версии завершенных картинок
                    const filteredPrev = prevCompleted.filter(img => !newCompletedIds.has(img.id));
                    // Возвращаем новый массив: свежезавершенные + отфильтрованные старые
                    return [...newlyCompleted, ...filteredPrev];
                });

                // 2. Удаляем завершенные из списка ожидания.
                setPendingGenerations(prevPending => {
                    const newCompletedIds = new Set(newlyCompleted.map(img => img.id));
                    return prevPending.filter(img => !newCompletedIds.has(img.id));
                });
            }

        }, 5000); // Poll every 5 seconds

        return () => clearInterval(intervalId); // Clear interval on unmount or change in pending

    }, [pendingGenerations]);

    // --- NEW: useEffect for Upscale Size Validation --- 
    const MAX_MEGAPIXELS = 32;
    useEffect(() => {
        // Reset error if no dimensions
        if (!upscaleImageDimensions.width || !upscaleImageDimensions.height) {
            // Clear only size-related errors? Or all? Clearing all for now.
            // Check if current error is size-related before clearing maybe?
            // For simplicity, let's clear any upscaleError when dimensions are not available.
            setUpscaleError(null);
            setIsUpscaleSizeValid(false); // Cannot be valid without dimensions
            return;
        }

        const { width, height } = upscaleImageDimensions;
        const factor = upscaleFactor;

        const newWidth = width * factor;
        const newHeight = height * factor;
        const megapixels = (newWidth * newHeight) / (1024 * 1024);

        console.log(`Validating size: ${width}x${height} * ${factor} = ${newWidth}x${newHeight} (~${megapixels.toFixed(1)}MP)`);

        if (megapixels > MAX_MEGAPIXELS) {
            const errorMsg = `Image too large for ${factor}x upscale (max ${MAX_MEGAPIXELS}MP). Result would be ~${megapixels.toFixed(1)}MP.`;
            console.warn(errorMsg);
            setUpscaleError(errorMsg);
            setIsUpscaleSizeValid(false);
        } else {
            // Size is valid, clear any previous size error
            // Only clear if the current error was the size error? Or clear all?
            // Let's clear any error if size becomes valid.
            setUpscaleError(null);
            setIsUpscaleSizeValid(true);
        }
        // Dependencies: recalculate whenever dimensions or factor change
    }, [upscaleImageDimensions, upscaleFactor]);
    // --- END Size Validation useEffect --- 

    // --- Функции для модального окна --- 
    const openImageModal = (imageUrl) => {
        setSelectedImageUrl(imageUrl);
    };
    const closeImageModal = () => {
        setSelectedImageUrl(null);
    };
    // --- Конец функций модального окна --- 

    // Helper function to process image list from backend and ensure aspect_ratio is set
    const prepareImagesForPendingState = (imageList, formSelectedAspectRatio) => {
        console.log('[prepareImagesForPendingState] Called with formSelectedAspectRatio:', formSelectedAspectRatio, 'for', imageList);
        return imageList.map(imgFromBackend => {
            const finalAspectRatio = imgFromBackend.aspect_ratio || formSelectedAspectRatio;
            console.log(`[prepareImagesForPendingState] imgFromBackend.id: ${imgFromBackend.id}, backendAR: ${imgFromBackend.aspect_ratio}, formAR: ${formSelectedAspectRatio}, finalAR: ${finalAspectRatio}`);
            return {
                ...imgFromBackend,
                aspect_ratio: finalAspectRatio
            };
        });
    };

    // --- Хелпер для CSS aspect-ratio ---
    const formatCssAspectRatio = (ratioStr) => {
        if (!ratioStr || typeof ratioStr !== 'string') return '1 / 1'; // По умолчанию 1:1 (квадрат)
        const parts = ratioStr.split(':');
        if (parts.length !== 2) return '1 / 1';
        const w = parseFloat(parts[0]);
        const h = parseFloat(parts[1]);
        if (isNaN(w) || isNaN(h) || w === 0 || h === 0) return '1 / 1';
        return `${w} / ${h}`;
    };

    // --- Helper to create error message with link ---
    const createPaymentRequiredMessage = (errorMessage) => {
        // Возвращаем JSX с центровкой и переносом строки
        return (
            <div className={styles.paymentRequiredMessage}> {/* Добавляем класс контейнеру */} 
                <div>You have insufficient funds.</div> {/* Текст на первой строке */} 
                <div> {/* Ссылка на второй строке */} 
                    <Link to="/billing" className={styles.inlineLink}>Add Credits?</Link>
                </div>
            </div>
        );
    };

    // --- Функция для скачивания изображения ---
    const handleDownloadImage = async (imageUrl, imageName = 'generated-image.png', event) => {
        if (event) event.stopPropagation(); // Prevent modal from opening
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', imageName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
            // Optionally, set an error state here to inform the user
        }
    };

    // --- Общий обработчик для новых кнопок ---
    const handleImageAction = (actionType, image, event) => { // Принимаем весь объект image
        if (event) event.stopPropagation(); // Prevent modal from opening
        console.log(`Action: ${actionType} for image ID: ${image.id}, URL: ${image.signed_url}`);

        // Helper function to scroll to the top of the left panel
        const scrollToLeftPanelTop = () => {
            // Ищем элемент левой панели. Убедитесь, что у .leftPanel есть соответствующий класс в CSS модуле.
            // Если .leftPanel - это класс из CSS модуля, то он будет доступен как styles.leftPanel
            // Если это глобальный класс или ID, используйте document.querySelector('.leftPanel') или document.getElementById('leftPanelId')
            const leftPanelElement = document.querySelector(`.${styles.leftPanel}`); 
            if (leftPanelElement) {
                leftPanelElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        if (actionType === 'Try On') {
            setLeftPanelTab('clothingTryOn');
            setTryOnModelFromGallery(image); // Сохраняем выбранное изображение из галереи
            setTryOnModelFile(null);      // Сбрасываем ручную загрузку модели
            setTryOnModelPreview(null);   // Сбрасываем превью ручной загрузки
            if (image.aspect_ratio) {
                setTryOnInputModelAspectRatio(image.aspect_ratio);
            } else {
                setTryOnInputModelAspectRatio(null);
            }
            scrollToLeftPanelTop(); // <--- ADD SCROLL
        } else if (actionType === 'Video') {
            alert(`Video creation for image ID: ${image.id} (Not implemented yet)`);
            // TODO: Implement video functionality
            // scrollToLeftPanelTop(); // Если нужно будет скроллить и для этой вкладки
        } else if (actionType === 'Upscale') {
            setLeftPanelTab('upscale');
            setUpscaleImageFromGallery(image);
            setUpscaleFile(null);        
            setUpscalePreviewUrl(null);  
            setUpscaleError(null);       

            if (image.aspect_ratio) {
                setUpscaleImageAspectRatio(image.aspect_ratio);
            }
            if (image.width && image.height) {
                setUpscaleImageDimensions({ width: image.width, height: image.height });
            } else {
                setUpscaleImageDimensions({ width: null, height: null });
                console.warn("[Upscale Gallery] Dimensions (width/height) not found on the selected gallery image object.");
            }
            scrollToLeftPanelTop(); // <--- ADD SCROLL
        } else {
            alert(`Unknown action: ${actionType} for image ID: ${image.id}`);
        }
    };

    // Handler for starting generation (для Model Photo, вызывает /lora-generate)
    const handleStartGeneration = async (event) => {
        event.preventDefault();
        setError(null);
        const selectedModel = models.find(m => m.id === selectedModelId);

        if (!prompt.trim()) { setError('Please enter a prompt.'); return; }
        if (!selectedModelId) { setError('Please select a model first.'); return; }
        if (!selectedModel || selectedModel.status !== 'ready') { setError('Selected model is not ready for generation.'); return; }
        if (isNaN(parseFloat(finetuneStrength)) || finetuneStrength < 0 || finetuneStrength > 2) { setError('Finetune strength must be a number between 0 and 2.'); return; }
        
        setIsSubmitting(true);
        try {
            const params = {
                prompt,
                aiModelId: selectedModelId,
                aspectRatio: aspectRatio, // <--- ПЕРЕДАЕМ aspectRatio НА БЕКЕНД
                num_images: modelNumImages, 
                finetuneStrength: parseFloat(finetuneStrength),
                style, 
                cameraAngle, 
                emotion, 
                light,
            };
            
            const response = await startLoraImageGeneration(params); 
            const newImageList = response.images;
            const newBalance = response.new_balance;

            if (Array.isArray(newImageList) && newImageList.length > 0) {
                const imagesWithDisplayInfo = prepareImagesForPendingState(newImageList, params.aspectRatio);
                setPendingGenerations(prev => [...imagesWithDisplayInfo, ...prev]);
                if (typeof newBalance === 'number' && updateUser) {
                     updateUser({ balance_points: newBalance });
                }
            } else {
                 setError('Received an invalid response after starting model generation.');
            }
            setPrompt(''); 
        } catch (err) {
            console.error('Failed to start LoRA model generation:', err);
            let displayError = err.message || 'Failed to start LoRA model generation.';
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

    // --- Функция для рендера контента вкладок --- 
    const renderTabContent = () => {
        switch (activeTab) {
            case 'Photo':
                return (
                    <section className={styles.resultsSection}>
                        {(pendingGenerations.length === 0 && completedHistory.length === 0 && !isHistoryLoading) ? (
                            <p className={styles.emptyText}>Your photo generations and upscales will appear here.</p>
                        ) : (
                            <div className={styles.imageList}>
                                {/* Сначала рендерим текущие генерации */} 
                                {pendingGenerations.map(img => {
                                    // Determine placeholder based on type
                                    let placeholderText = 'Processing...';
                                    if (img.generation_type === 'upscale') {
                                        placeholderText = 'Upscaling...';
                                    }
                                    if (img.generation_type === 'try_on') {
                                        placeholderText = 'Trying on...';
                                    }
                                    console.log(`[Pending Render] Image ID: ${img.id}, Type: ${img.generation_type}, Aspect Ratio for CSS: ${img.aspect_ratio}, Formatted: ${formatCssAspectRatio(img.aspect_ratio)}`); // DEBUG LOG
                                    return (
                                        <div key={`pending-${img.id}`} className={`${styles.imageCard} ${styles.pendingCard}`}> 
                                            <div 
                                                className={styles.imagePlaceholder}
                                                style={{ aspectRatio: formatCssAspectRatio(img.aspect_ratio) }} // Применяем aspect-ratio
                                            >
                                                 <GenerationTimer startTime={img.created_at} prefixText={placeholderText} />
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Затем рендерим историю */} 
                                {isHistoryLoading && pendingGenerations.length === 0 && completedHistory.length === 0 ? (
                                     <div className={styles.loadingSpinner}></div>
                                ) : (
                                    completedHistory.map(img => {
                                        // --- URL ТЕПЕРЬ ПРИХОДИТ НАПРЯМУЮ В img.signed_url ---
                                        const displayImageUrl = img.signed_url; 
                                        // --- КОНЕЦ ---
                                        
                                        let altText = img.prompt || 'Generated Image';
                                        if (img.generation_type === 'upscale') {
                                            altText = 'Upscaled Image';
                                            if (img.prompt) altText += ` (${img.prompt})`;
                                        }
                                            
                                        return (
                                            <div key={`completed-${img.id}`} className={styles.imageCard}>
                                                {img.status === 'Ready' && displayImageUrl ? (
                                                    <>
                                                        <img 
                                                            src={displayImageUrl} 
                                                            alt={altText}
                                                            className={styles.generatedImage} 
                                                            loading="lazy" 
                                                            onClick={() => openImageModal(displayImageUrl)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        {/* Кнопка три точки (меню) - видна, если меню для этой карточки ЗАКРЫТО */}
                                                        {actionsMenuOpenForId !== img.id && (
                                                            // Добавляем класс .singleMenuButtonContainer для особого выравнивания
                                                            <div className={`${styles.imageCardActions} ${styles.singleMenuButtonContainer}`}> 
                                                                <button 
                                                                    className={`${styles.actionButton} ${styles.menuButton}`}
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        setActionsMenuOpenForId(img.id);
                                                                    }}
                                                                    title="Actions"
                                                                >
                                                                    {/* SVG for three dots (ellipsis-vertical) */}
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 14c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Блок с 4 кнопками, появляется если меню открыто для этой карточки */}
                                                        {actionsMenuOpenForId === img.id && (
                                                            // Этот блок остается с обычным .imageCardActions для распределения 4 кнопок
                                                        <div className={styles.imageCardActions}>
                                                            <button 
                                                                className={styles.actionButton} 
                                                                    onClick={(e) => { e.stopPropagation(); handleImageAction('Try On', img, e); setActionsMenuOpenForId(null); }}
                                                                title="Try On"
                                                            >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l4.5-5h11L22 8l-5 2v10c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V10L2 8z"></path><path d="M2 8l6-5"></path><path d="M22 8l-6-5"></path></svg>
                                                            </button>
                                                            <button 
                                                                className={styles.actionButton} 
                                                                    onClick={(e) => { e.stopPropagation(); handleImageAction('Video', img, e); setActionsMenuOpenForId(null); }}
                                                                title="Create Video"
                                                            >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                                            </button>
                                                            <button 
                                                                className={styles.actionButton} 
                                                                    onClick={(e) => { e.stopPropagation(); handleImageAction('Upscale', img, e); setActionsMenuOpenForId(null); }}
                                                                title="Upscale Image"
                                                            >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="15 3 21 3 21 9"></polygon><polygon points="9 21 3 21 3 15"></polygon><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                                                            </button>
                                                            <button 
                                                                className={`${styles.actionButton} ${styles.downloadButtonAction}`} 
                                                                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(displayImageUrl, `image-${img.id}.png`, e); setActionsMenuOpenForId(null); }}
                                                                title="Download image"
                                                            >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                            </button>
                                                        </div>
                                                        )}
                                                    </>
                                                ) : img.status === 'Ready' && !displayImageUrl && img.r2_object_key ? ( // УПРОЩЕННАЯ ПРОВЕРКА: если Ready, есть ключ, но нет URL - значит ошибка генерации URL на беке
                                                    <div 
                                                        className={styles.imagePlaceholder}
                                                        style={{ aspectRatio: formatCssAspectRatio(img.aspect_ratio) || '1 / 1' }}
                                                    >
                                                        Error loading image URL.
                                                    </div>
                                                ) : (
                                                    <div 
                                                        className={styles.imagePlaceholder}
                                                        style={{ aspectRatio: formatCssAspectRatio(img.aspect_ratio) || '1 / 1' }}
                                                    >
                                                        {img.status === 'Failed' ? 
                                                          (img.generation_type === 'upscale' ? 'Upscale Failed' : 'Generation Failed') 
                                                          : (img.status === 'Ready' && !img.r2_object_key ? 'Error: Key Missing' : 'Image Unavailable')}
                                                    </div>
                                                )}
                                                {/* Optional: Add a badge or indicator for upscaled images */}
                                                {img.status === 'Ready' && img.generation_type && (
                                                    <span 
                                                        className={`
                                                            ${styles.generationTypeBadge}
                                                            ${img.generation_type === 'upscale' ? styles.badgeUpscale : ''}
                                                            ${img.generation_type === 'model_photo' ? styles.badgeModelPhoto : ''}
                                                            ${img.generation_type === 'text_to_image' ? styles.badgeTextToImage : ''}
                                                            ${img.generation_type === 'try_on' ? styles.badgeTryOn : ''}
                                                        `}
                                                    >
                                                        {/* Dynamically set badge text */}
                                                        {img.generation_type === 'upscale' ? 'Upscaled' : 
                                                         img.generation_type === 'model_photo' ? 'Model Gen' : 
                                                         img.generation_type === 'text_to_image' ? 'Text Gen' :
                                                         img.generation_type === 'try_on' ? 'Try-On' : 'Generated'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                {/* Конец рендера истории */}
                            </div>
                        )}
                        {/* Кнопка "Загрузить еще" */}
                        {hasMoreHistory && (
                            <div className={styles.loadMoreContainer}>
                                <button 
                                    onClick={loadMoreHistory} 
                                    disabled={isHistoryLoadingMore} 
                                    className={styles.loadMoreButton}
                                >
                                    {isHistoryLoadingMore ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </section>
                );
            case 'Video':
                 return (
                    <section className={styles.resultsSection}>
                        <p className={styles.emptyText}>Video generation feature coming soon!</p>
                    </section>
                );
            case 'Favorite':
                return (
                    <section className={styles.resultsSection}>
                        <p className={styles.emptyText}>Favorites feature coming soon!</p>
                    </section>
                );
            default:
                return null;
        }
    };
    // --- Конец renderTabContent --- 

    // Handler for starting Text-to-Image generation (MODIFIED)
    const handleTextToImageSubmit = async (event) => {
        event.preventDefault();
        setTextError(null); 
        if (!textPrompt.trim()) {
            setTextError('Please enter a prompt.');
            return;
        }
        setIsSubmittingText(true);
        try {
            const params = {
                prompt: textPrompt,
                aspectRatio: textAspectRatio, // Используем aspectRatio для базовой генерации
                num_images: textNumImages,
                // aiModelId не передаем, бекенд /start ожидает его отсутствие
                // style, cameraAngle, emotion можно передать, если они есть в этой форме
            };
            // Используем API эндпоинт для базовой генерации
            const response = await startBaseImageGeneration(params); 
            const newImageList = response.images;
            const newBalance = response.new_balance;

            if (Array.isArray(newImageList) && newImageList.length > 0) {
                 // Добавляем aspectRatio к объектам для корректного отображения в плейсхолдерах
                const imagesWithDisplayInfo = prepareImagesForPendingState(newImageList, params.aspectRatio);
                setPendingGenerations(prev => [...imagesWithDisplayInfo, ...prev]);
                if (typeof newBalance === 'number' && updateUser) {
                     updateUser({ balance_points: newBalance });
                }
            } else {
                setTextError('Received an invalid response after starting generation.');
            }
            setTextPrompt(''); 
        } catch (err) {
            console.error('Failed to start base text-to-image generation:', err);
            let displayError = err.message || 'Failed to start base text-to-image generation.';
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
    // --- End of Text-to-Image handler ---

    // --- Clothing Try-On File Handlers (Updated from person/clothing) ---
    const handleModelFileForTryOnChange = (event) => {
        const file = event.target.files[0];
        setClothingTryOnError(null);
        setTryOnInputModelAspectRatio(null); // Reset aspect ratio on new file selection
        setTryOnModelFromGallery(null); // <-- Сбрасываем выбор из галереи при ручной загрузке

        if (file) {
            setTryOnModelFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setTryOnModelPreview(reader.result);
                // Calculate aspect ratio from model image
                const img = new Image();
                img.onload = () => {
                    if (img.naturalWidth && img.naturalHeight) {
                        setTryOnInputModelAspectRatio(`${img.naturalWidth}:${img.naturalHeight}`);
                    }
                };
                img.onerror = () => {
                    setClothingTryOnError('Could not read model image dimensions for aspect ratio.');
                };
                img.src = reader.result;
            };
            reader.onerror = () => {
                setClothingTryOnError('Error reading model image file.');
                setTryOnModelFile(null); 
                setTryOnModelPreview(null);
            }
            reader.readAsDataURL(file);
        } else {
            setTryOnModelFile(null);
            setTryOnModelPreview(null);
        }
    };

    const handleGarmentFileForTryOnChange = (event) => {
        const file = event.target.files[0];
        setClothingTryOnError(null);
        if (file) {
            setTryOnGarmentFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setTryOnGarmentPreview(reader.result);
            reader.onerror = () => setClothingTryOnError('Error reading garment image file.');
            reader.readAsDataURL(file);
        } else {
            setTryOnGarmentFile(null);
            setTryOnGarmentPreview(null);
        }
    };
    // --- END Clothing Try-On File Handlers ---

    // --- Update file selection handler --- 
    const handleUpscaleFileChange = (event) => {
        const file = event.target.files[0];
        setUpscaleError(null); 
        setUpscaleImageDimensions({ width: null, height: null }); 
        setUpscaleImageAspectRatio(null); // <-- Сбрасываем aspectRatio
        setIsUpscaleSizeValid(false); 
        setUpscalePreviewUrl(null);
        setUpscaleImageFromGallery(null); // <-- NEW: Reset gallery selection

        if (file) {
            setUpscaleFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setUpscalePreviewUrl(reader.result); 
                const img = new Image();
                img.onload = () => {
                    console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
                    setUpscaleImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    // Рассчитываем и сохраняем aspectRatio
                    if (img.naturalWidth && img.naturalHeight) {
                        setUpscaleImageAspectRatio(`${img.naturalWidth}:${img.naturalHeight}`);
                    }
                };
                img.onerror = () => {
                    console.error("Error loading image for dimension check.");
                    setUpscaleError('Could not read image dimensions.');
                    setUpscaleImageDimensions({ width: null, height: null });
                    setIsUpscaleSizeValid(false);
                };
                img.src = reader.result; // Use the Data URL from FileReader
            };
            reader.onerror = () => {
                console.error("Error reading file.");
                setUpscaleError('Error reading the selected file.');
                setUpscaleFile(null);
                 setIsUpscaleSizeValid(false);
            };
            reader.readAsDataURL(file);
        } else {
            setUpscaleFile(null);
            // Dimensions, validity, preview already reset above
        }
         event.target.value = null; // Reset input value to allow selecting the same file again
    };
    // --- END Handle file selection --- 

    // --- NEW Handler for starting Image Upscale --- 
    const handleStartUpscale = async (event) => {
        event.preventDefault();
        // ... (проверки upscaleFile)

        // Basic check if file is selected - enhance if needed
        if (!upscaleFile && !upscaleImageFromGallery) { // <-- MODIFIED condition
            setUpscaleError('Please select an image to upscale or choose one from the gallery.');
            return;
        }
         if (!isUpscaleSizeValid) {
             setUpscaleError('Selected image is too large for the chosen upscale factor or dimensions could not be determined.'); // MODIFIED message
             return;
         }

        setUpscaleError(null); // Clear previous errors before submitting
        setIsSubmittingUpscale(true);
        try {
            const formData = new FormData();
            if (upscaleImageFromGallery && upscaleImageFromGallery.signed_url) { // <-- NEW path for gallery image
                formData.append('image_url', upscaleImageFromGallery.signed_url);
            } else if (upscaleFile) { // <-- Existing path for uploaded file
            formData.append('image', upscaleFile);
            } else {
                 // This case should ideally be caught by the check above
                 setUpscaleError('No image source selected for upscale.');
                 setIsSubmittingUpscale(false);
                 return;
            }
            formData.append('upscale_factor', upscaleFactor);

            // console.log("Submitting Upscale with file:", upscaleFile.name, "Factor:", upscaleFactor);
            if (upscaleImageFromGallery) {
                console.log("Submitting Upscale with gallery image ID:", upscaleImageFromGallery.id, "Factor:", upscaleFactor);
            } else if (upscaleFile) {
            console.log("Submitting Upscale with file:", upscaleFile.name, "Factor:", upscaleFactor);
            }

            const response = await startImageUpscale(formData);
            const newImageList = response.images; // Это массив с одной записью от бэкенда
            const newBalance = response.new_balance;
            console.log("Upscale started, response:", response);

            if (Array.isArray(newImageList) && newImageList.length > 0) {
                const imageToProcess = newImageList[0]; // Upscale returns a single image in an array
                const aspectRatioForUpscale = upscaleImageAspectRatio || '1:1'; // Fallback specific to upscale
                const imagesWithDisplayInfo = prepareImagesForPendingState([imageToProcess], aspectRatioForUpscale);

                setPendingGenerations(prev => [...imagesWithDisplayInfo, ...prev]);
                
                // Обновляем баланс, если он пришел
                if (typeof newBalance === 'number' && updateUser) {
                     console.log("[DashboardPage] Updating balance via context after upscale:", newBalance);
                     updateUser({ balance_points: newBalance });
                } else if (newBalance === null) {
                    console.warn("[DashboardPage] Backend returned null balance after upscale.")
                }
            } else {
                console.error('Backend did not return a valid list for upscale job');
                 // Use the specific error if already set, otherwise a generic one
                if (!upscaleError) { 
                     setUpscaleError('Received an invalid response after starting upscale.');
                }
            }

            // Clear state *after* successful submission start
            setUpscaleFile(null);
            setUpscalePreviewUrl(null);
            setUpscaleImageDimensions({ width: null, height: null });
            setUpscaleImageAspectRatio(null); // <-- Сбрасываем aspectRatio после использования
            setIsUpscaleSizeValid(false); 
            setUpscaleImageFromGallery(null); // <-- NEW: Reset gallery selection on success
            // Explicitly clear the file input field
            const fileInput = document.getElementById('upscale-file-input'); 
            if (fileInput) {
                 fileInput.value = null;
            }

        } catch (err) {
            console.error('Failed to start upscale:', err);
            let displayError = err.message || 'Failed to start upscale process.';
             // Проверяем на ошибку 402
             if (err.response?.status === 402 && err.data?.error) {
                 displayError = createPaymentRequiredMessage(err.data.error);
             } else if (err.data?.error) {
                 displayError = err.data.error; // Используем сообщение от бэкенда, если оно есть
             }
            setUpscaleError(displayError); // Устанавливаем ошибку для формы upscale
        } finally {
            setIsSubmittingUpscale(false);
        }
    };
    // --- END Upscale handler --- 

    // --- Handler for starting Clothing Try-On Generation (Updated from placeholder) ---
    const handleClothingTryOnSubmit = async (event) => {
        event.preventDefault();
        setClothingTryOnError(null);

        if (!tryOnModelFile && !tryOnModelFromGallery) { // <-- Проверка на выбор модели
            setClothingTryOnError('Please select a model image or choose one from the gallery.');
            return;
        }
        if (!tryOnGarmentFile) {
            setClothingTryOnError('Please select a garment image.');
            return;
        }

        setIsSubmittingClothingTryOn(true);
        try {
            const formData = new FormData();
            
            if (tryOnModelFromGallery && tryOnModelFromGallery.signed_url) {
                // Если модель из галереи, передаем URL напрямую
                formData.append('model_image_url', tryOnModelFromGallery.signed_url);
                
                // Сохраняем aspect_ratio, если он есть
                if (tryOnModelFromGallery.aspect_ratio) {
                    formData.append('model_aspect_ratio', tryOnModelFromGallery.aspect_ratio);
                     // Обновляем tryOnInputModelAspectRatio, если он был от галерейного изображения
                     if (!tryOnInputModelAspectRatio) {
                        setTryOnInputModelAspectRatio(tryOnModelFromGallery.aspect_ratio);
                    }
                }
            } else if (tryOnModelFile) {
                // Если модель загружена пользователем, передаем файл
                formData.append('model_image', tryOnModelFile);
            }
            // Файл одежды всегда передается как файл
            formData.append('garment_image', tryOnGarmentFile);
            formData.append('num_images', tryOnNumImages);

            // Опциональные параметры можно также добавлять в formData, если они есть
            // formData.append('category', tryOnCategory); // Пример

            const response = await startTryOnGeneration(formData);
            const newImageList = response.images;
            const newBalance = response.new_balance;

            if (Array.isArray(newImageList) && newImageList.length > 0) {
                // Используем tryOnInputModelAspectRatio, который должен быть актуален
                const aspectRatioForPending = tryOnInputModelAspectRatio || '3:4'; // Фоллбэк
                const imagesWithDisplayInfo = prepareImagesForPendingState(newImageList, aspectRatioForPending);
                
                const finalImagesToPending = imagesWithDisplayInfo.map(img => ({
                    ...img,
                    generation_type: 'try_on' 
                }));

                setPendingGenerations(prev => [...finalImagesToPending, ...prev]);
                if (typeof newBalance === 'number' && updateUser) {
                    updateUser({ balance_points: newBalance });
                }
            } else {
                setClothingTryOnError('Received an invalid response after starting try-on.');
            }
            // Сброс полей формы
            setTryOnModelFile(null);
            setTryOnModelPreview(null);
            setTryOnGarmentFile(null);
            setTryOnGarmentPreview(null);
            setTryOnModelFromGallery(null); // <-- Сбрасываем выбор из галереи
            setTryOnInputModelAspectRatio(null); 
            
            const modelInput = document.getElementById('personPhotoInput'); 
            if (modelInput) modelInput.value = null;
            const garmentInput = document.getElementById('clothingPhotoInput'); 
            if (garmentInput) garmentInput.value = null;

        } catch (err) {
            console.error('Failed to start clothing try-on generation:', err);
            let displayError = err.message || 'Failed to start clothing try-on generation.';
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
    // --- END Clothing Try-On Handler ---

    // Render loading state
    if (authLoading && !user) {
        return <div className={styles.loadingText}>Loading dashboard...</div>;
    }

    return (
        <div className={styles.dashboardContainer}>
            {/* Top Tab Navigation (Moved from Left Panel) */}
            <div className={styles.topTabContainer}>
                <button
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'modelPhoto' ? styles.activeTab : ''}`}
                    onClick={() => setLeftPanelTab('modelPhoto')}
                >
                    Model Photo
                </button>
                <button
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'descriptionGeneration' ? styles.activeTab : ''}`}
                    onClick={() => setLeftPanelTab('descriptionGeneration')}
                >
                    Text to Image
                </button>
                 {/* Перемещенная кнопка Clothing Try-On */}
                 <button
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'clothingTryOn' ? styles.activeTab : ''}`}
                    onClick={() => setLeftPanelTab('clothingTryOn')}
                >
                    Clothing Try-On
                </button>
                <button
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'upscale' ? styles.activeTab : ''}`}
                    onClick={() => setLeftPanelTab('upscale')}
                >
                    Upscale
                </button>
                {/* New Live Photo Tab */}
                <button
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'livePhoto' ? styles.activeTab : ''}`}
                    onClick={() => setLeftPanelTab('livePhoto')}
                >
                    Live Photo
                </button>
            </div>

            {/* NEW: Wrapper for Left and Right Panels - Use class from CSS module */}
            <div className={styles.panelsWrapper}>

                {/* Левая панель (Original Content, without tabs) */}
                <div className={styles.leftPanel}>
                    {/* Tab Navigation for Left Panel - REMOVED FROM HERE */}
                    {/* <div className={styles.tabContainer} style={{ marginBottom: '1rem' }}> ... buttons ... </div> */}

                    {/* Conditional Rendering based on leftPanelTab */}
                    {leftPanelTab === 'modelPhoto' && (
                        <>
                            {/* Выбор модели */}
                            <div className={styles.modelSelectionContainer}>
                                <div className={styles.modelSelectionHeader}>
                                    {/* Используем новый общий класс .sectionTitle */}
                                    <h3 className={styles.sectionTitle}>Select Your Model</h3>
                                    <Link to="/create-model" className={styles.addButton} title="Add new model">
                                       + Add
                                    </Link>
                                </div>
                                
                                {modelsLoading ? (
                                    <p className={styles.loadingText}>Loading models...</p>
                                ) : models && models.length > 0 ? (
                                    <div className={styles.modelList}>
                                        {models.map(model => {
                                            const isReady = model.status === 'ready';
                                            const isTraining = model.status === 'training';
                                            
                                            // --- URL ПРЕВЬЮ ТЕПЕРЬ В model.signed_preview_url ---
                                            const previewDisplayUrl = model.signed_preview_url; 
                                            // --- КОНЕЦ ---
                                            const modelNameForPlaceholder = model?.name || 'N/A';
                                            const encodedName = encodeURIComponent(modelNameForPlaceholder);
                                            const fallbackModelPlaceholder = `https://via.placeholder.com/150/8B5CF6/FFFFFF?text=Model+${encodedName}`;

                                            return (
                                                <div
                                                    key={model.id}
                                                    className={`
                                                        ${styles.modelCard}
                                                        ${selectedModelId === model.id && isReady ? styles.selectedModel : ''}
                                                        ${isTraining ? styles.trainingModel : ''}
                                                        ${!isReady ? styles.disabledModel : ''}
                                                    `}
                                                    onClick={() => isReady && setSelectedModelId(model.id)}
                                                    title={isReady ? `Select model ${model.name}` : `Model ${model.name} is ${model.status}`}
                                                >
                                                    {isTraining && (
                                                        <div className={styles.trainingOverlay}>
                                                            <span className={styles.trainingSpinner}></span>
                                                        </div>
                                                    )}
                                                    <img
                                                        src={previewDisplayUrl || fallbackModelPlaceholder} // Используем прямой URL или fallback
                                                        alt={`Model ${model.name}`}
                                                        className={styles.modelImage}
                                                        style={{ opacity: isTraining ? 0.3 : 1 }}
                                                        onError={(e) => { e.target.src = fallbackModelPlaceholder; }} 
                                                    />
                                                    <p className={styles.modelName}>
                                                        {isTraining ? 'Training...' : (model.status === 'failed' ? 'Failed' : model.name)}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.createModelPrompt}>
                                        <h3>No Models Found</h3>
                                        <p>Create your first personalized AI model to start generating images.</p>
                                        <Link to="/create-model" className={styles.createModelButton}>Create First Model</Link>
                                    </div>
                                )}
                            </div>

                            {/* Форма генерации - показываем только если модель ВЫБРАНА */}
                            {models && models.length > 0 ? (
                                selectedModelId ? (
                                    <>
                                        <form onSubmit={handleStartGeneration} className={styles.generationForm}>
                                            {/* Поле Prompt */}
                                            <div>
                                                <label htmlFor="prompt" className={styles.label}>Prompt:</label>
                                                <textarea
                                                    id="prompt"
                                                    value={prompt}
                                                    onChange={(e) => setPrompt(e.target.value)}
                                                    placeholder="Describe the image you want to generate..."
                                                    required
                                                    disabled={isSubmitting} 
                                                    className={styles.textarea}
                                                    rows="4"
                                                />
                                            </div>
                                            {/* Возвращаем селектор Aspect Ratio */}
                                            <div>
                                                <label htmlFor="aspectRatioModel" className={styles.label}>Aspect Ratio:</label>
                                                <select 
                                                    id="aspectRatioModel" // Даем уникальный ID, если aspectRatio также используется для Text-to-Image
                                                    value={aspectRatio} // Используем состояние aspectRatio
                                                    onChange={(e) => setAspectRatio(e.target.value)} 
                                                    disabled={isSubmitting} 
                                                    className="select-custom"
                                                >
                                                    {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{ASPECT_RATIO_LABELS[opt] || opt}</option>)}
                                                </select>
                                            </div>
                                            {/* Селекторы Стиль, Камера, Эмоция */}
                                            <div className={styles.selectorsGrid}>
                                                <div>
                                                    <label htmlFor="style" className={styles.label}>Style:</label>
                                                    <select id="style" value={style} onChange={(e) => setStyle(e.target.value)} disabled={isSubmitting} className="select-custom">
                                                        <option value="">Default</option>
                                                        {STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="light" className={styles.label}>Light:</label>
                                                    <select id="light" value={light} onChange={(e) => setLight(e.target.value)} disabled={isSubmitting} className="select-custom">
                                                        <option value="">Default</option>
                                                        {LIGHT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="cameraAngle" className={styles.label}>Camera:</label>
                                                    <select id="cameraAngle" value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} disabled={isSubmitting} className="select-custom">
                                                        <option value="">Default</option>
                                                        {CAMERA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="emotion" className={styles.label}>Emotion:</label>
                                                    <select id="emotion" value={emotion} onChange={(e) => setEmotion(e.target.value)} disabled={isSubmitting} className="select-custom">
                                                        <option value="">Default</option>
                                                        {EMOTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Слайдер Finetune Strength */}
                                            <div>
                                                <label htmlFor="finetuneStrength" className={styles.label}>
                                                    Finetune Strength (0-2):
                                                    <span className={styles.strengthValue}>{finetuneStrength}</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    id="finetuneStrength"
                                                    min="0"
                                                    max="2"
                                                    step="0.05"
                                                    value={finetuneStrength}
                                                    onChange={(e) => setFinetuneStrength(parseFloat(e.target.value))}
                                                    disabled={isSubmitting} 
                                                    className={styles.rangeInput}
                                                />
                                            </div>

                                            {/* === Используем новый компонент для Model Photo === */}
                                            <NumImagesSelect 
                                                id="modelNumImages"
                                                label="Number of Images:"
                                                value={modelNumImages}
                                                onChange={setModelNumImages} // Передаем функцию установки состояния
                                                disabled={isSubmitting}
                                            />
                                            {/* === КОНЕЦ использования компонента === */}

                                            {/* Сообщение об ошибке */}
                                            {error && <div className={styles.errorMessage}>{error}</div>}

                                            {/* Кнопка Submit */} 
                                            <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                                                {isSubmitting ? 'Starting...' : 'Start Generation'} 
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <div className={styles.selectModelPrompt}> {/* Новый стиль для этого блока */}
                                        <p>Please select a model from the list above to start generating images.</p>
                                    </div>
                                )
                            ) : null /* Если моделей нет вообще, ничего не показываем здесь */}
                        </>
                    )}

                    {leftPanelTab === 'descriptionGeneration' && (
                         <div className={styles.textToImageContainer}> 
                             <form onSubmit={handleTextToImageSubmit} className={styles.generationForm}>
                                 {/* Оборачиваем h3 и p в div, чтобы gap формы не создавал отступ между ними */}
                                 <div>
                                     <h3 className={styles.sectionTitle}>Image Generation</h3>
                                     <p>Generate images directly from text descriptions using the base model.</p>
                                 </div>

                                 {/* Поле Prompt */}
                                 <div>
                                     <label htmlFor="textPrompt" className={styles.label}>Prompt:</label>
                                     <textarea
                                         id="textPrompt"
                                         value={textPrompt}
                                         onChange={(e) => setTextPrompt(e.target.value)}
                                         placeholder="Describe the image you want..."
                                         required
                                         disabled={isSubmittingText}
                                         className={styles.textarea}
                                         rows="4"
                                     />
                                 </div>
                                 
                                 {/* Выбор Aspect Ratio */}
                                 <div>
                                     <label htmlFor="textAspectRatio" className={styles.label}>Aspect Ratio:</label>
                                     <select 
                                         id="textAspectRatio" 
                                         value={textAspectRatio} 
                                         onChange={(e) => setTextAspectRatio(e.target.value)} 
                                         disabled={isSubmittingText} 
                                         className="select-custom"
                                     >
                                         {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{ASPECT_RATIO_LABELS[opt] || opt}</option>)}
                                     </select>
                                 </div>

                                 {/* === Используем новый компонент для Text to Image === */}
                                 <NumImagesSelect 
                                     id="textNumImages"
                                     label="Number of Images:"
                                     value={textNumImages}
                                     onChange={setTextNumImages} // Передаем другую функцию установки состояния
                                     disabled={isSubmittingText}
                                 />
                                 {/* === КОНЕЦ использования компонента === */}

                                 {/* Сообщение об ошибке */}
                                 {textError && <div className={styles.errorMessage}>{textError}</div>}

                                 {/* Кнопка Submit */}
                                 <button type="submit" disabled={isSubmittingText} className={styles.submitButton}>
                                     {isSubmittingText ? 'Starting...' : 'Start Text-to-Image Generation'}
                                 </button>
                             </form>
                         </div>
                    )}

                     {leftPanelTab === 'upscale' && (
                         <div className={styles.upscaleContainer}> {/* Use a specific container style */} 
                             <form onSubmit={handleStartUpscale} className={styles.generationForm}> {/* Reuse form style */} 
                                 {/* Переносим h3 и p сюда, внутрь формы, оборачиваем в div */}
                                 <div>
                                     <h3 className={styles.sectionTitle}>Image Upscaling</h3>
                                     <p>Increase the resolution of your images using AI.</p>
                                 </div>

                                 {/* --- Updated File Input Area --- */ }
                                 <div>
                                     <label htmlFor="upscale-file-input" className={styles.label}>
                                        Image for Upscale:
                                        {upscaleImageFromGallery ?
                                            ` (Selected from Gallery: ID ${upscaleImageFromGallery.id ? String(upscaleImageFromGallery.id).substring(0,8) : 'N/A'})` :
                                            (upscaleFile && ` (${upscaleFile.name})`)
                                        }
                                    </label>
                                    <div
                                        className={`${styles.imageUploadArea} ${(upscalePreviewUrl || (upscaleImageFromGallery && upscaleImageFromGallery.signed_url)) ? styles.hasPreview : ''}`}
                                        onClick={() => !upscaleImageFromGallery && document.getElementById('upscale-file-input').click()}
                                        // Add onDragOver, onDragLeave, onDrop handlers here if drag & drop is desired for upscale
                                    >
                                         <input 
                                             type="file"
                                             id="upscale-file-input"
                                             accept=".png, .jpg, .jpeg, .webp" 
                                             onChange={handleUpscaleFileChange}
                                            className={styles.fileInputNative} // Assuming styles.fileInputNative and styles.imageUploadArea exist and are suitable
                                            disabled={isSubmittingUpscale || !!upscaleImageFromGallery} // Disable manual upload if gallery image is selected
                                            style={{ display: 'none' }}
                                        />

                                        {(upscalePreviewUrl || (upscaleImageFromGallery && upscaleImageFromGallery.signed_url)) ? (
                                            <img
                                                src={upscaleImageFromGallery ? upscaleImageFromGallery.signed_url : upscalePreviewUrl}
                                                alt="Upscale preview"
                                                className={styles.imagePreviewInArea} // Assuming styles.imagePreviewInArea exists and is suitable
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className={styles.uploadAreaPrompt}> {/* Assuming styles.uploadAreaPrompt exists */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                <span>Click to upload</span>
                                                {/* Add "or drag & drop" if D&D handlers are implemented above */}
                                                <span className={styles.uploadAreaHint}>Image for upscaling</span>
                                     </div>
                                 )}

                                        {(upscaleImageFromGallery || upscaleFile) && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUpscaleImageFromGallery(null);
                                                    setUpscaleFile(null);
                                                    setUpscalePreviewUrl(null);
                                                    setUpscaleImageDimensions({ width: null, height: null });
                                                    setUpscaleImageAspectRatio(null);
                                                    setIsUpscaleSizeValid(false);
                                                    const input = document.getElementById('upscale-file-input');
                                                    if (input) input.value = null;
                                                }}
                                                className={`${styles.clearSelectionButton} ${styles.clearInAreaButton}`} // Assuming these styles exist
                                                title="Clear selected image"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        )}
                                    </div>
                                 </div>
                                 {/* --- End Updated File Input Area --- */}

                                 {/* Upscale Factor (remains the same) */ }
                                 <div>
                                     <label htmlFor="upscaleFactor" className={styles.label}>Upscale Factor:</label>
                                     <select 
                                         id="upscaleFactor" 
                                         value={upscaleFactor} 
                                         onChange={(e) => setUpscaleFactor(parseFloat(e.target.value))} 
                                         disabled={isSubmittingUpscale} 
                                         className="select-custom"
                                     >
                                         <option value={2}>2x</option>
                                         <option value={4}>4x</option>  {/* Add more if supported */}
                                     </select>
                                 </div> 

                                 {/* Error Message (remains the same) */} 
                                 {upscaleError && <div className={styles.errorMessage}>{upscaleError}</div>}

                                 {/* Submit Button */} 
                                 <button 
                                     type="submit" 
                                     disabled={isSubmittingUpscale || (!upscaleFile && !upscaleImageFromGallery) || !isUpscaleSizeValid} // MODIFIED
                                     className={styles.submitButton}
                                     title={!isUpscaleSizeValid && (upscaleFile || upscaleImageFromGallery) ? (upscaleError || 'Image too large or dimensions undetermined') : undefined} // MODIFIED
                                 >
                                     {isSubmittingUpscale ? 'Upscaling...' : 'Start Upscale'} 
                                 </button>
                             </form>
                         </div>
                     )}

                     {leftPanelTab === 'clothingTryOn' && (
                         <div className={styles.tryOnContainer}> {/* Using tryOnContainer for styling consistency */}
                            <form onSubmit={handleClothingTryOnSubmit} className={styles.generationForm}>
                                {/* Заголовок и описание */}
                                <div>
                                    <h3 className={styles.sectionTitle}>Clothing Try-On</h3>
                                    <p>Upload a photo of a person and a photo of clothing to see a preview.</p>
                                </div>

                                {/* Model (Person) Image Upload */}
                                <div className={styles.fileInputSection}>
                                    <label htmlFor="personPhotoInput" className={styles.label}>
                                        Model (Person) Image:
                                        {tryOnModelFromGallery ? 
                                            ` (Selected: ${tryOnModelFromGallery.id != null ? String(tryOnModelFromGallery.id).substring(0,8) : 'Gallery Img'})` : 
                                            (tryOnModelFile && `(${tryOnModelFile.name})`)
                                        }
                                    </label>

                                    {/* Новый контейнер для области загрузки и предпросмотра */}
                                    <div 
                                        className={`${styles.imageUploadArea} ${(tryOnModelPreview || (tryOnModelFromGallery && tryOnModelFromGallery.signed_url)) ? styles.hasPreview : ''}`}
                                        onClick={() => document.getElementById('personPhotoInput').click()} // Клик по области триггерит инпут
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver); }}
                                        onDragLeave={(e) => { e.currentTarget.classList.remove(styles.dragOver); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove(styles.dragOver);
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                // Создаем синтетическое событие для handleModelFileForTryOnChange
                                                const syntheticEvent = { target: { files: e.dataTransfer.files } };
                                                handleModelFileForTryOnChange(syntheticEvent);
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            id="personPhotoInput"
                                            accept="image/jpeg, image/png, image/webp"
                                            onChange={handleModelFileForTryOnChange}
                                            className={styles.fileInputNative}
                                            disabled={isSubmittingClothingTryOn}
                                            style={{ display: 'none' }} // Явно скрываем, т.к. управляем через родителя
                                        />

                                        {/* Предпросмотр, если есть */}
                                        {(tryOnModelPreview || (tryOnModelFromGallery && tryOnModelFromGallery.signed_url)) ? (
                                            <img
                                                src={tryOnModelPreview || (tryOnModelFromGallery && tryOnModelFromGallery.signed_url)}
                                                alt="Model preview"
                                                className={styles.imagePreviewInArea}
                                                onClick={(e) => e.stopPropagation()} // Остановить всплытие, чтобы не триггерить загрузку файла
                                            />
                                        ) : (
                                            // Текст-приглашение, если нет предпросмотра
                                            <div className={styles.uploadAreaPrompt}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="17 8 12 3 7 8"></polyline>
                                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                                </svg>
                                                <span>Click to upload or drag & drop</span>
                                                <span className={styles.uploadAreaHint}>Recommended: Clear, front-facing</span>
                                            </div>
                                        )}

                                        {/* Кнопка "Clear" для галерейного/загруженного изображения */}
                                        {(tryOnModelFromGallery || tryOnModelFile) && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Остановить всплытие, чтобы не триггерить загрузку файла
                                                    setTryOnModelFromGallery(null);
                                                    setTryOnModelFile(null); 
                                                    setTryOnModelPreview(null);
                                                    const input = document.getElementById('personPhotoInput');
                                                    if (input) input.value = null;
                                                }}
                                                className={`${styles.clearSelectionButton} ${styles.clearInAreaButton}`}
                                                title="Clear selected model image"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    {/* {tryOnModelError && <p className={styles.errorMessage}>{tryOnModelError}</p>} */} {/* Можно оставить, если tryOnModelError актуален */}
                                </div>

                                {/* Garment Image Upload */}
                                <div className={styles.fileInputSection}>
                                    <label htmlFor="clothingPhotoInput" className={styles.label}>
                                        Garment Image: {tryOnGarmentFile && `(${tryOnGarmentFile.name})`}
                                    </label>
                                    {/* Новый контейнер для области загрузки и предпросмотра ОДЕЖДЫ */}
                                    <div 
                                        className={`${styles.imageUploadArea} ${tryOnGarmentPreview ? styles.hasPreview : ''}`}
                                        onClick={() => document.getElementById('clothingPhotoInput').click()}
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver); }}
                                        onDragLeave={(e) => { e.currentTarget.classList.remove(styles.dragOver); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove(styles.dragOver);
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                const syntheticEvent = { target: { files: e.dataTransfer.files } };
                                                handleGarmentFileForTryOnChange(syntheticEvent);
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            id="clothingPhotoInput"
                                            accept="image/jpeg, image/png, image/webp"
                                            onChange={handleGarmentFileForTryOnChange}
                                            className={styles.fileInputNative}
                                            disabled={isSubmittingClothingTryOn}
                                            style={{ display: 'none' }} // Явно скрываем
                                            required 
                                        />
                                        {tryOnGarmentPreview ? (
                                            <img
                                                src={tryOnGarmentPreview}
                                                alt="Garment preview"
                                                className={styles.imagePreviewInArea} // Используем тот же класс для превью
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className={styles.uploadAreaPrompt}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    {/* Можно использовать другую иконку для одежды, например, иконку футболки */}
                                                    <path d="M20.38 3.46 16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
                                                </svg>
                                                <span>Click to upload or drag & drop garment</span>
                                                <span className={styles.uploadAreaHint}>E.g., t-shirt, dress, pants</span>
                                            </div>
                                        )}
                                        {/* Кнопка "Clear" для превью одежды */}
                                        {tryOnGarmentFile && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTryOnGarmentFile(null); 
                                                    setTryOnGarmentPreview(null);
                                                    const input = document.getElementById('clothingPhotoInput');
                                                    if (input) input.value = null;
                                                }}
                                                className={`${styles.clearSelectionButton} ${styles.clearInAreaButton}`}
                                                title="Clear selected garment image"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    {/* Старый блок превью для одежды удален, т.к. превью теперь внутри imageUploadArea */}
                                </div>
                                
                                <NumImagesSelect 
                                    id="tryOnNumImages"
                                    label="Number of Images:"
                                    value={tryOnNumImages}
                                    onChange={setTryOnNumImages}
                                    disabled={isSubmittingClothingTryOn}
                                />

                                {clothingTryOnError && <div className={styles.errorMessage}>{typeof clothingTryOnError === 'string' ? clothingTryOnError : JSON.stringify(clothingTryOnError)}</div>}

                                <button
                                    type="submit"
                                    disabled={isSubmittingClothingTryOn || (!tryOnModelFile && !tryOnModelFromGallery) || !tryOnGarmentFile}
                                    className={styles.submitButton}
                                >
                                    {isSubmittingClothingTryOn ? 'Trying On...' : 'Start Try-On'} 
                                 </button>
                             </form>
                         </div>
                     )}

                     {leftPanelTab === 'livePhoto' && (
                         <div className={styles.tabPlaceholder}>
                             <p>Live Photo feature will be here.</p>
                         </div>
                     )}

                </div> {/* End of Left Panel */}

                {/* Правая панель (Unchanged) */}
                <div className={styles.rightPanel}>
                    {/* Tab Navigation */}
                    <div className={styles.tabContainer}>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'Photo' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('Photo')}
                        >
                            Photo
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'Video' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('Video')}
                        >
                            Video
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'Favorite' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('Favorite')}
                        >
                            Favorite
                        </button>
                    </div>
                    {/* Tab Content Area */}
                    <div className={styles.tabContent}>
                         {renderTabContent()}
                    </div>
                </div> {/* End of Right Panel */}

            </div> {/* End of NEW Wrapper Div */}

            {/* Рендерим модальное окно (вне основного потока) */}
            <ImageModal imageUrl={selectedImageUrl} onClose={closeImageModal} />
        </div>
    );
}

export default DashboardPage;