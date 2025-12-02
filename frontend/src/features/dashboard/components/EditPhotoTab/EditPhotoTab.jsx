import React, { useState, useEffect } from 'react';
import { useMultiFileUpload } from '../../hooks/useFileUpload';
import NumImagesSelect from '../../../../components/NumImagesSelect';
import UniversalSubmitButton from '../../../../components/UniversalSubmitButton';
import FileUploader from '../../../../components/FileUploader';
import CustomSelect from '../../../../components/CustomSelect';
import { ASPECT_RATIO_OPTIONS, ASPECT_RATIO_LABELS } from '../../../../constants/aspectRatio';
import styles from './EditPhotoTab.module.css';

const EDIT_MODELS = [
    { value: 'nano_banana_pro', label: 'Nano Banana Pro' },
    { value: 'flux_2_pro', label: 'Flux 2 Pro' }
];

const EditPhotoTab = ({ 
    onSubmit, 
    isSubmitting, 
    error,
    costs,
    imageFromGallery,
    onClearGalleryImage
}) => {
    const {
        files,
        previews,
        error: fileError,
        handleFilesChange,
        removeFile,
        reset
    } = useMultiFileUpload(10);

    const [selectedModel, setSelectedModel] = useState('nano_banana_pro');
    const [prompt, setPrompt] = useState('');
    const [numImages, setNumImages] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('');

    // Auto-set aspect ratio from gallery image
    useEffect(() => {
        if (imageFromGallery?.aspect_ratio) {
            // Check if gallery aspect_ratio matches our options
            if (ASPECT_RATIO_OPTIONS.includes(imageFromGallery.aspect_ratio)) {
                setAspectRatio(imageFromGallery.aspect_ratio);
            } else {
                // Keep Auto if aspect ratio doesn't match standard options
                setAspectRatio('');
            }
        }
    }, [imageFromGallery]);

    const isFluxModel = selectedModel === 'flux_2_pro';
    const effectiveNumImages = isFluxModel ? 1 : numImages;

    const getCostKey = () => {
        return selectedModel === 'nano_banana_pro' 
            ? 'edit_photo_nano_banana' 
            : 'edit_photo_flux';
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const hasImage = files.length > 0 || imageFromGallery;
        if (!prompt.trim() || !hasImage) {
            return;
        }

        const formData = new FormData();
        
        if (imageFromGallery && imageFromGallery.signed_url) {
            formData.append('image_url', imageFromGallery.signed_url);
        } else {
            files.forEach((file) => {
                formData.append('image_urls', file);
            });
        }
        
        formData.append('model', selectedModel);
        formData.append('prompt', prompt);
        formData.append('num_images', effectiveNumImages);
        
        if (aspectRatio) {
            formData.append('aspect_ratio', aspectRatio);
        }

        // Передаём aspectRatio для placeholder: если Auto (пустой) → '1:1', иначе выбранный
        onSubmit(formData, aspectRatio || '1:1');

        setPrompt('');
        setNumImages(1);
        reset();
        if (onClearGalleryImage) {
            onClearGalleryImage();
        }
    };

    const handleClearImage = () => {
        reset();
        if (onClearGalleryImage) {
            onClearGalleryImage();
        }
    };

    const hasImage = files.length > 0 || imageFromGallery;

    const baseCost = costs?.[getCostKey()] || 0;
    const totalCost = baseCost * effectiveNumImages;

    return (
        <form onSubmit={handleSubmit} className={styles.editPhotoForm}>
            <div className={styles.header}>
                <h3>Edit Photo</h3>
                <span className={styles.badge}>AI</span>
            </div>
            
            <p className={styles.description}>
                Edit your images with AI-powered transformations.
            </p>

            {/* Model Selection */}
            <CustomSelect
                label="Model"
                value={selectedModel}
                onChange={setSelectedModel}
                options={EDIT_MODELS}
                disabled={isSubmitting}
                allowEmpty={false}
            />

            {/* Image Upload */}
            {imageFromGallery ? (
                <div>
                    <label>Selected Image:</label>
                    <div className={styles.galleryImageContainer}>
                        <img 
                            src={imageFromGallery.signed_url} 
                            alt="From gallery" 
                            className={styles.previewImage}
                        />
                        <div className={styles.galleryImageInfo}>
                            <span>From Gallery</span>
                            {imageFromGallery.aspect_ratio && (
                                <span className={styles.aspectRatioInfo}>
                                    {imageFromGallery.aspect_ratio}
                                </span>
                            )}
                            <button 
                                type="button"
                                onClick={handleClearImage}
                                className={styles.clearButton}
                            >
                                Change Image
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <FileUploader
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple={true}
                    maxFiles={10}
                    maxSizeMB={10}
                    onChange={(fileArray) => {
                        if (fileArray && fileArray.length > 0) {
                            const fakeEvent = { target: { files: fileArray } };
                            handleFilesChange(fakeEvent);
                        }
                    }}
                    disabled={isSubmitting}
                    label="Upload Images (1-10)"
                    showPreview={true}
                />
            )}

            {/* Prompt */}
            <div>
                <label>Editing Prompt:</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how you want to edit the images..."
                    required
                    disabled={isSubmitting}
                    rows={3}
                />
            </div>

            {/* Settings Grid */}
            <div className={styles.settingsGrid}>
                <CustomSelect
                    label="Aspect Ratio"
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    options={ASPECT_RATIO_OPTIONS.map(ratio => ({
                        value: ratio,
                        label: ASPECT_RATIO_LABELS[ratio]
                    }))}
                    disabled={isSubmitting}
                    allowEmpty={true}
                    emptyLabel="Auto (from images)"
                />

                <NumImagesSelect
                    label="Output Images per Input"
                    value={effectiveNumImages}
                    onChange={setNumImages}
                    disabled={isSubmitting || isFluxModel}
                    max={4}
                />
            </div>

            {/* Error */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* Info */}
            <div className={styles.infoBox}>
                <p><strong>How it works:</strong></p>
                <ul>
                    <li>Upload 1-10 images you want to edit</li>
                    <li>Describe the changes in the prompt</li>
                    <li>Cost per attempt: {baseCost} points × {effectiveNumImages} output{effectiveNumImages > 1 ? 's' : ''} = {totalCost} points</li>
                    <li><em>Number of uploaded images does not affect the cost</em></li>
                </ul>
            </div>

            <UniversalSubmitButton
                isSubmitting={isSubmitting}
                actionCost={totalCost}
                disabled={!hasImage || !prompt.trim()}
            />
        </form>
    );
};

export default EditPhotoTab;
