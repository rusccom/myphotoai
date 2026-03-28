import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCosts } from '../services/api';
import SEO from '../components/SEO';

// Hooks
import { useImageHistory } from '../features/dashboard/hooks/useImageHistory';
import { useGenerationHandlers } from '../features/dashboard/hooks/useGenerationHandlers';
import { usePresets } from '../features/dashboard/hooks/usePresets';
import { useWebSocket } from '../hooks/useWebSocket';

// Components
import PhotoGallery from '../features/dashboard/components/PhotoGallery/PhotoGallery';
import EditPhotoTab from '../features/dashboard/components/EditPhotoTab/EditPhotoTab';
import ModelPhotoTab from '../features/dashboard/components/ModelPhotoTab/ModelPhotoTab';
import TextToImageTab from '../features/dashboard/components/TextToImageTab/TextToImageTab';
import UpscaleTab from '../features/dashboard/components/UpscaleTab/UpscaleTab';
import ClothingTryOnTab from '../features/dashboard/components/ClothingTryOnTab/ClothingTryOnTab';
import LivePhotoTab from '../features/dashboard/components/LivePhotoTab/LivePhotoTab';
import PresetTab from '../features/dashboard/components/PresetTab/PresetTab';
import ImageModal from '../components/ImageModal';
import ScrollToTopButton from '../components/ScrollToTopButton';

import styles from './DashboardPage.module.css';

function DashboardPage() {
    const { user, models, modelsLoading, refreshModels, updateUser } = useAuth();
    const location = useLocation();

    // Tab states
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [activeTab, setActiveTab] = useState('Photo');
    const [leftPanelTab, setLeftPanelTab] = useState('modelPhoto');
    const [mobileGalleryView, setMobileGalleryView] = useState('double'); // 'single' or 'double'

    // Costs
    const [costs, setCosts] = useState(null);

    // Modal
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    // Gallery selection
    const [upscaleImageFromGallery, setUpscaleImageFromGallery] = useState(null);
    const [tryOnModelFromGallery, setTryOnModelFromGallery] = useState(null);
    const [editPhotoImageFromGallery, setEditPhotoImageFromGallery] = useState(null);

    // History hook
    const {
        allImages,
        isHistoryLoading,
        hasMoreHistory,
        isHistoryLoadingMore,
        setPendingGenerations,
        loadMoreHistory,
        handleImageUpdate, // Получаем handler для WebSocket
    } = useImageHistory();

    // Presets hook
    const {
        categories: presetCategories,
        presets,
        isLoading: isPresetsLoading,
    } = usePresets();

    // WebSocket подключение для real-time обновлений
    useWebSocket(user?.id, handleImageUpdate);

    // Generation handlers hook
    const {
        isSubmittingEditPhoto,
        editPhotoError,
        handleEditPhotoSubmit,
        isSubmitting,
        error,
        handleModelPhotoSubmit,
        isSubmittingText,
        textError,
        handleTextToImageSubmit,
        isSubmittingUpscale,
        upscaleError,
        handleUpscaleSubmit,
        isSubmittingClothingTryOn,
        clothingTryOnError,
        handleClothingTryOnSubmit,
    } = useGenerationHandlers(models, selectedModelId, updateUser, setPendingGenerations);

    // Hash navigation
    useEffect(() => {
        const hash = location.hash.substring(1);
        const validTabs = ['editPhoto', 'modelPhoto', 'descriptionGeneration', 'upscale', 'clothingTryOn', 'livePhoto']; 
        if (hash && validTabs.includes(hash)) {
            setLeftPanelTab(hash);
        }
    }, [location.hash]);

    // Scroll to top on tab change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [leftPanelTab]);

    // Fetch costs
    useEffect(() => {
        const fetchCosts = async () => {
            try {
                const costsData = await getCosts();
                setCosts(costsData);
            } catch (error) {
                console.error("Failed to fetch costs:", error);
            }
        };
        fetchCosts();
    }, []);

    // Auto-select first ready model
    useEffect(() => {
        if (!modelsLoading && models && models.length > 0) {
            const firstReadyModel = models.find(m => m.status === 'ready');
            if (firstReadyModel && !selectedModelId) {
                setSelectedModelId(firstReadyModel.id);
            }
        }
    }, [models, modelsLoading, selectedModelId]);

    // Poll models in training
    useEffect(() => {
        const modelsInTraining = models.filter(m => m.status === 'training');
        if (modelsInTraining.length === 0) return;

        const intervalId = setInterval(() => {
            refreshModels();
        }, 15000);

        return () => clearInterval(intervalId);
    }, [models, refreshModels]);

    const handleImageAction = (actionType, image, event) => {
        if (event) event.stopPropagation();

        const scrollToLeftPanelTop = () => {
            const leftPanelElement = document.querySelector(`.${styles.leftPanel}`); 
            if (leftPanelElement) {
                leftPanelElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        if (actionType === 'Try On') {
            setLeftPanelTab('clothingTryOn');
            setTryOnModelFromGallery(image);
            scrollToLeftPanelTop();
        } else if (actionType === 'Upscale') {
            setLeftPanelTab('upscale');
            setUpscaleImageFromGallery(image);
            scrollToLeftPanelTop();
        } else if (actionType === 'Edit Photo') {
            setLeftPanelTab('editPhoto');
            setEditPhotoImageFromGallery(image);
            scrollToLeftPanelTop();
        } else if (actionType === 'Video') {
            alert(`Video creation for image ID: ${image.id} (Not implemented yet)`);
        }
    };

    const renderLeftPanelContent = () => {
        switch (leftPanelTab) {
            case 'editPhoto':
                return (
                    <EditPhotoTab
                        onSubmit={handleEditPhotoSubmit}
                        isSubmitting={isSubmittingEditPhoto}
                        error={editPhotoError}
                        costs={costs}
                        imageFromGallery={editPhotoImageFromGallery}
                        onClearGalleryImage={() => setEditPhotoImageFromGallery(null)}
                    />
                );

            case 'modelPhoto':
                return (
                    <ModelPhotoTab
                        models={models}
                        modelsLoading={modelsLoading}
                        selectedModelId={selectedModelId}
                        setSelectedModelId={setSelectedModelId}
                        onSubmit={handleModelPhotoSubmit}
                        isSubmitting={isSubmitting}
                        error={error}
                        costs={costs}
                    />
                );

            case 'descriptionGeneration':
                return (
                    <TextToImageTab
                        onSubmit={handleTextToImageSubmit}
                        isSubmitting={isSubmittingText}
                        error={textError}
                        costs={costs}
                    />
                );

            case 'upscale':
                return (
                    <UpscaleTab
                        onSubmit={(formData, aspectRatio) => handleUpscaleSubmit(formData, aspectRatio)}
                        isSubmitting={isSubmittingUpscale}
                        error={upscaleError}
                        costs={costs}
                        imageFromGallery={upscaleImageFromGallery}
                        onClearGalleryImage={() => setUpscaleImageFromGallery(null)}
                    />
                );

            case 'clothingTryOn':
                return (
                    <ClothingTryOnTab
                        onSubmit={handleClothingTryOnSubmit}
                        isSubmitting={isSubmittingClothingTryOn}
                        error={clothingTryOnError}
                        costs={costs}
                        modelImageFromGallery={tryOnModelFromGallery}
                        onClearGalleryModel={() => setTryOnModelFromGallery(null)}
                    />
                );

            case 'livePhoto':
                return <LivePhotoTab />;

            default:
                return null;
        }
    };

    const renderRightPanelContent = () => {
        switch (activeTab) {
            case 'Photo':
                return (
                    <PhotoGallery
                        allImages={allImages}
                        isHistoryLoading={isHistoryLoading}
                        hasMoreHistory={hasMoreHistory}
                        isHistoryLoadingMore={isHistoryLoadingMore}
                        onLoadMore={loadMoreHistory}
                        onImageAction={handleImageAction}
                        onOpenModal={setSelectedImageUrl}
                        mobileGalleryView={mobileGalleryView}
                    />
                );

            case 'Video':
                 return (
                    <section className={styles.resultsSection}>
                        <p className={styles.emptyText}>
                            Video generation feature coming soon!
                        </p>
                    </section>
                );

            case 'Favorite':
                return (
                    <section className={styles.resultsSection}>
                        <p className={styles.emptyText}>
                            Favorites feature coming soon!
                        </p>
                    </section>
                );

            case 'Preset':
                return (
                    <PresetTab
                        categories={presetCategories}
                        presets={presets}
                        isLoading={isPresetsLoading}
                        models={models}
                        onGenerationStart={(result) => {
                            if (result.images) {
                                setPendingGenerations(prev => [...result.images, ...prev]);
                            }
                        }}
                        updateUser={updateUser}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <>
            <SEO noindex={true} />
            <div className={styles.dashboardContainer}>
            {/* Left Panel Tab Navigation */}
            <div className={styles.topTabContainer}>
                <button
                    onClick={() => setLeftPanelTab('modelPhoto')}
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'modelPhoto' ? styles.activeTab : ''}`}
                >
                    Model Photo
                </button>
                <button
                    onClick={() => setLeftPanelTab('editPhoto')}
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'editPhoto' ? styles.activeTab : ''}`}
                >
                    Edit Photo
                </button>
                <button
                    onClick={() => setLeftPanelTab('descriptionGeneration')}
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'descriptionGeneration' ? styles.activeTab : ''}`}
                >
                    Text to Image
                </button>
                 <button
                    onClick={() => setLeftPanelTab('clothingTryOn')}
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'clothingTryOn' ? styles.activeTab : ''}`}
                >
                    Clothing Try-On
                </button>
                <button
                    onClick={() => setLeftPanelTab('upscale')}
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'upscale' ? styles.activeTab : ''}`}
                >
                    Upscale
                </button>
                <button
                    onClick={() => setLeftPanelTab('livePhoto')}
                    className={`${styles.tabButton} ${styles.topTabButton} ${leftPanelTab === 'livePhoto' ? styles.activeTab : ''}`}
                >
                    Live Photo
                </button>
            </div>

            {/* Panels wrapper */}
            <div className={styles.panelsWrapper}>
                {/* Left panel */}
                <div className={styles.leftPanel}>
                    {renderLeftPanelContent()}
                                </div>

                {/* Right panel */}
                <div className={styles.rightPanel}>
                    {/* Right Panel Tabs with View Controls */}
                    <div className={styles.tabContainerWithControls}>
                        <div className={styles.tabContainer}>
                            <button
                                onClick={() => setActiveTab('Photo')}
                                className={`${styles.tabButton} ${activeTab === 'Photo' ? styles.activeTab : ''}`}
                            >
                                Photo
                            </button>
                            <button
                                onClick={() => setActiveTab('Video')}
                                className={`${styles.tabButton} ${activeTab === 'Video' ? styles.activeTab : ''}`}
                            >
                                Video
                            </button>
                            <button
                                onClick={() => setActiveTab('Favorite')}
                                className={`${styles.tabButton} ${activeTab === 'Favorite' ? styles.activeTab : ''}`}
                            >
                                Favorite
                            </button>
                            <button
                                onClick={() => setActiveTab('Preset')}
                                className={`${styles.tabButton} ${styles.presetTabButton} ${activeTab === 'Preset' ? styles.activeTab : ''}`}
                            >
                                Preset
                            </button>
                        </div>
                        
                        {/* Mobile View Toggle Buttons */}
                        <div className={styles.mobileViewControls}>
                            <button
                                onClick={() => setMobileGalleryView('single')}
                                className={`${styles.viewButton} ${mobileGalleryView === 'single' ? styles.activeViewButton : ''}`}
                                title="Single column"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="5" y="3" width="14" height="8" rx="1"/>
                                    <rect x="5" y="13" width="14" height="8" rx="1"/>
                                </svg>
                            </button>
                            <button
                                onClick={() => setMobileGalleryView('double')}
                                className={`${styles.viewButton} ${mobileGalleryView === 'double' ? styles.activeViewButton : ''}`}
                                title="Two columns"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="8" height="8" rx="1"/>
                                    <rect x="13" y="3" width="8" height="8" rx="1"/>
                                    <rect x="3" y="13" width="8" height="8" rx="1"/>
                                    <rect x="13" y="13" width="8" height="8" rx="1"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Right Panel Content */}
                    {renderRightPanelContent()}

                    {/* Scroll to Top Button */}
                    <ScrollToTopButton />
                </div>
            </div>

            {/* Image Modal */}
            {selectedImageUrl && (
                <ImageModal
                    imageUrl={selectedImageUrl}
                    onClose={() => setSelectedImageUrl(null)}
                />
            )}
            </div>
        </>
    );
}

export default DashboardPage;
