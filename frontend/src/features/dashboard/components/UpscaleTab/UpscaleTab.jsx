import React, { useState, useEffect } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import UniversalSubmitButton from '../../../../components/UniversalSubmitButton';
import FileUploader from '../../../../components/FileUploader';
import styles from './UpscaleTab.module.css';

const MAX_MEGAPIXELS = 32;
const UPSCALE_FACTORS = [2, 3, 4];

const UpscaleTab = ({ 
    onSubmit, 
    isSubmitting, 
    error,
    costs,
    imageFromGallery,
    onClearGalleryImage
}) => {
    const {
        file,
        previewUrl,
        dimensions,
        aspectRatio,
        error: fileError,
        handleFileChange,
        reset
    } = useFileUpload();

    const [upscaleFactor, setUpscaleFactor] = useState(2);
    const [isSizeValid, setIsSizeValid] = useState(false);
    const [sizeError, setSizeError] = useState(null);

    // Get dimensions from gallery image or uploaded file
    const sourceDimensions = imageFromGallery 
        ? { width: imageFromGallery.width, height: imageFromGallery.height }
        : dimensions;

    // Validate size when dimensions or factor change
    useEffect(() => {
        if (!sourceDimensions || !sourceDimensions.width || !sourceDimensions.height) {
            setSizeError(null);
            setIsSizeValid(false);
            return;
        }

        const { width, height } = sourceDimensions;
        const factor = upscaleFactor;
        const newWidth = width * factor;
        const newHeight = height * factor;
        const megapixels = (newWidth * newHeight) / (1024 * 1024);

        if (megapixels > MAX_MEGAPIXELS) {
            const errorMsg = `Image too large for ${factor}x upscale (max ${MAX_MEGAPIXELS}MP). Result would be ~${megapixels.toFixed(1)}MP.`;
            setSizeError(errorMsg);
            setIsSizeValid(false);
        } else {
            setSizeError(null);
            setIsSizeValid(true);
        }
    }, [sourceDimensions, upscaleFactor]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!file && !imageFromGallery) {
            return;
        }

        if (!isSizeValid) {
            return;
        }

        const formData = new FormData();
        
        if (imageFromGallery && imageFromGallery.signed_url) {
            formData.append('image_url', imageFromGallery.signed_url);
        } else if (file) {
            formData.append('image', file);
        }
        
        formData.append('upscale_factor', upscaleFactor);

        // Pass aspectRatio for placeholder (from uploaded file or gallery)
        const imageAspectRatio = aspectRatio || imageFromGallery?.aspect_ratio;
        onSubmit(formData, imageAspectRatio);

        // Reset after submission
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
        setSizeError(null);
        setIsSizeValid(false);
    };

    const hasImage = file || imageFromGallery;

    return (
        <form onSubmit={handleSubmit} className={styles.upscaleForm}>
            <h3>Upscale Image</h3>
            <p className={styles.description}>
                Enhance image resolution up to 4x. Max output size: {MAX_MEGAPIXELS}MP.
            </p>

            {/* Image Source */}
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
                            <span>✓ From Gallery</span>
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
                    multiple={false}
                    maxSizeMB={10}
                    onChange={(file) => {
                        if (file) {
                            const fakeEvent = { target: { files: [file] } };
                            handleFileChange(fakeEvent);
                        }
                    }}
                    disabled={isSubmitting}
                    label="Select Image"
                    showPreview={true}
                />
            )}

            {/* Image Info */}
            {hasImage && sourceDimensions && sourceDimensions.width && (
                <div className={styles.imageInfo}>
                    <p>
                        <strong>Original:</strong> {sourceDimensions.width}×{sourceDimensions.height}
                        {' '}({(sourceDimensions.width * sourceDimensions.height / 1024 / 1024).toFixed(1)}MP)
                    </p>
                    <p>
                        <strong>Result:</strong> {sourceDimensions.width * upscaleFactor}×{sourceDimensions.height * upscaleFactor}
                        {' '}({((sourceDimensions.width * upscaleFactor) * (sourceDimensions.height * upscaleFactor) / 1024 / 1024).toFixed(1)}MP)
                    </p>
                </div>
            )}

            {/* Upscale Factor */}
            <div>
                <label>Upscale Factor:</label>
                <div className={styles.factorButtons}>
                    {UPSCALE_FACTORS.map(factor => (
                        <button
                            key={factor}
                            type="button"
                            onClick={() => setUpscaleFactor(factor)}
                            className={`${styles.factorButton} ${upscaleFactor === factor ? styles.active : ''}`}
                            disabled={isSubmitting}
                        >
                            {factor}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Errors */}
            {(error || fileError || sizeError) && (
                <div className={styles.errorMessage}>
                    {error || fileError || sizeError}
                </div>
            )}

            <UniversalSubmitButton
                isSubmitting={isSubmitting}
                baseCost={costs?.upscale}
                quantity={1}
                disabled={!hasImage || !isSizeValid}
            />
        </form>
    );
};

export default UpscaleTab;

