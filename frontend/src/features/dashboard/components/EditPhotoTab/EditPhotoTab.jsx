import React, { useState } from 'react';
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
    costs 
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

    const isFluxModel = selectedModel === 'flux_2_pro';
    const effectiveNumImages = isFluxModel ? 1 : numImages;

    const getCostKey = () => {
        return selectedModel === 'nano_banana_pro' 
            ? 'edit_photo_nano_banana' 
            : 'edit_photo_flux';
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!prompt.trim() || files.length === 0) {
            return;
        }

        const formData = new FormData();
        
        files.forEach((file) => {
            formData.append('image_urls', file);
        });
        
        formData.append('model', selectedModel);
        formData.append('prompt', prompt);
        formData.append('num_images', effectiveNumImages);
        
        if (aspectRatio) {
            formData.append('aspect_ratio', aspectRatio);
        }

        onSubmit(formData);

        setPrompt('');
        setNumImages(1);
        reset();
    };

    const costPerImage = costs?.[getCostKey()] || 0;
    const totalCost = costPerImage * files.length * effectiveNumImages;

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
                    <li>
                        Total cost: {files.length} images × {effectiveNumImages} outputs × {costPerImage} points = {totalCost} points
                    </li>
                    {isFluxModel && <li><em>Flux 2 Pro generates 1 output per image</em></li>}
                </ul>
            </div>

            <UniversalSubmitButton
                isSubmitting={isSubmitting}
                actionCost={totalCost}
                disabled={files.length === 0 || !prompt.trim()}
            />
        </form>
    );
};

export default EditPhotoTab;
