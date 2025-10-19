import React from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import NumImagesSelect from '../../../../components/NumImagesSelect';
import UniversalSubmitButton from '../../../../components/UniversalSubmitButton';
import FileUploader from '../../../../components/FileUploader';
import styles from './ClothingTryOnTab.module.css';

const ClothingTryOnTab = ({ 
    onSubmit, 
    isSubmitting, 
    error,
    costs,
    modelImageFromGallery,
    onClearGalleryModel
}) => {
    const modelUpload = useFileUpload();
    const garmentUpload = useFileUpload();
    const [numImages, setNumImages] = React.useState(2);

    const hasModelImage = modelImageFromGallery || modelUpload.file;
    const hasGarmentImage = garmentUpload.file;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!hasModelImage || !hasGarmentImage) {
            return;
        }

        const formData = new FormData();
        
        if (modelImageFromGallery && modelImageFromGallery.signed_url) {
            formData.append('model_image_url', modelImageFromGallery.signed_url);
            if (modelImageFromGallery.aspect_ratio) {
                formData.append('model_aspect_ratio', modelImageFromGallery.aspect_ratio);
            }
        } else if (modelUpload.file) {
            formData.append('model_image', modelUpload.file);
        }

        formData.append('garment_image', garmentUpload.file);
        formData.append('num_images', numImages);

        onSubmit(formData, modelUpload.aspectRatio || modelImageFromGallery?.aspect_ratio);

        // Reset after submission
        modelUpload.reset();
        garmentUpload.reset();
        if (onClearGalleryModel) {
            onClearGalleryModel();
        }
    };

    const handleClearModel = () => {
        modelUpload.reset();
        if (onClearGalleryModel) {
            onClearGalleryModel();
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.tryOnForm}>
            <h3>Virtual Try-On</h3>
            <p className={styles.description}>
                Upload a model photo and a garment image to see how it looks.
            </p>

            {/* Model Image */}
            {modelImageFromGallery ? (
                <div>
                    <label>Model Photo:</label>
                    <div className={styles.galleryImageContainer}>
                        <img 
                            src={modelImageFromGallery.signed_url} 
                            alt="Model from gallery" 
                            className={styles.previewImage}
                        />
                        <div className={styles.galleryImageInfo}>
                            <span>✓ From Gallery</span>
                            <button 
                                type="button"
                                onClick={handleClearModel}
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
                            modelUpload.handleFileChange(fakeEvent);
                        }
                    }}
                    disabled={isSubmitting}
                    label="Model Photo"
                    showPreview={true}
                />
            )}

            {/* Garment Image */}
            <FileUploader
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple={false}
                maxSizeMB={10}
                onChange={(file) => {
                    if (file) {
                        const fakeEvent = { target: { files: [file] } };
                        garmentUpload.handleFileChange(fakeEvent);
                    }
                }}
                disabled={isSubmitting}
                label="Garment Photo"
                showPreview={true}
            />

            {/* Number of Images */}
            <div>
                <label>Number of Images:</label>
                <NumImagesSelect
                    value={numImages}
                    onChange={setNumImages}
                    disabled={isSubmitting}
                />
            </div>

            {/* Error */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* Info */}
            <div className={styles.infoBox}>
                <p>
                    💡 <strong>Tips:</strong>
                </p>
                <ul>
                    <li>Use clear, front-facing photos for best results</li>
                    <li>Model should be in similar pose to garment</li>
                    <li>Avoid busy backgrounds</li>
                </ul>
            </div>

            <UniversalSubmitButton
                isSubmitting={isSubmitting}
                actionCost={costs?.virtual_try_on || 0}
                actionName="Try On"
                submitText="Generate Try-On"
                disabled={!hasModelImage || !hasGarmentImage}
            />
        </form>
    );
};

export default ClothingTryOnTab;

