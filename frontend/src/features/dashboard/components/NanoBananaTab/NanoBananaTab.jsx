import React, { useState } from 'react';
import { useMultiFileUpload } from '../../hooks/useFileUpload';
import NumImagesSelect from '../../../../components/NumImagesSelect';
import UniversalSubmitButton from '../../../../components/UniversalSubmitButton';
import FileUploader from '../../../../components/FileUploader';
import CustomSelect from '../../../../components/CustomSelect';
import styles from './NanoBananaTab.module.css';

const OUTPUT_FORMATS = ['jpeg', 'png'];
const ASPECT_RATIO_OPTIONS = ['4:5', '3:4', '9:16', '16:9', '1:1', '4:3', '2:3', '3:2', '5:4', '21:9'];
const ASPECT_RATIO_LABELS = {
    '4:5': '4:5 Portrait (Instagram)',
    '3:4': '3:4 Tall Portrait',
    '9:16': '9:16 Vertical (Stories/Reels)',
    '16:9': '16:9 Widescreen',
    '1:1': '1:1 Square (Instagram Post)',
    '4:3': '4:3 Classic Landscape',
    '2:3': '2:3 Portrait Photo',
    '3:2': '3:2 Standard Photo',
    '5:4': '5:4 Medium Format',
    '21:9': '21:9 Ultrawide'
};

const NanoBananaTab = ({ 
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

    const [prompt, setPrompt] = useState('');
    const [numImages, setNumImages] = useState(1);
    const [outputFormat, setOutputFormat] = useState('jpeg');
    const [aspectRatio, setAspectRatio] = useState('');
    const [syncMode, setSyncMode] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!prompt.trim()) {
            return;
        }

        if (files.length === 0) {
            return;
        }

        const formData = new FormData();
        
        files.forEach((file) => {
            formData.append('image_urls', file);
        });
        
        formData.append('prompt', prompt);
        formData.append('num_images', numImages);
        formData.append('output_format', outputFormat);
        if (aspectRatio) {
            formData.append('aspect_ratio', aspectRatio);
        }
        formData.append('sync_mode', syncMode);

        onSubmit(formData);

        // Reset after submission
        setPrompt('');
        setNumImages(1);
        reset();
    };

    return (
        <form onSubmit={handleSubmit} className={styles.nanoBananaForm}>
            <div className={styles.header}>
                <h3>⭐ Nano Banana</h3>
                <span className={styles.badge}>Advanced</span>
            </div>
            
            <p className={styles.description}>
                Edit multiple images simultaneously with AI-powered transformations.
            </p>

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
                <NumImagesSelect
                    label="Output Images per Input"
                    value={numImages}
                    onChange={setNumImages}
                    disabled={isSubmitting}
                    max={4}
                />

                <CustomSelect
                    label="Output Format"
                    value={outputFormat}
                    onChange={setOutputFormat}
                    options={OUTPUT_FORMATS.map(format => ({
                        value: format,
                        label: format.toUpperCase()
                    }))}
                    disabled={isSubmitting}
                    allowEmpty={false}
                />

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
            </div>

            {/* Sync Mode Toggle */}
            <div className={styles.checkboxContainer}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={syncMode}
                        onChange={(e) => setSyncMode(e.target.checked)}
                        disabled={isSubmitting}
                        className={styles.checkbox}
                    />
                    <span>Sync Mode (Wait for all images to complete)</span>
                </label>
            </div>

            {/* Error */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* Info */}
            <div className={styles.infoBox}>
                <p><strong>💡 How it works:</strong></p>
                <ul>
                    <li>Upload 1-10 images you want to edit</li>
                    <li>Describe the changes in the prompt</li>
                    <li>Each image will be processed independently</li>
                    <li>
                        Total cost: {files.length} images × {numImages} outputs × {costs?.nano_banana || 0} points
                    </li>
                </ul>
            </div>

            <UniversalSubmitButton
                isSubmitting={isSubmitting}
                actionCost={(costs?.nano_banana || 0) * files.length * numImages}
                disabled={files.length === 0 || !prompt.trim()}
            />
        </form>
    );
};

export default NanoBananaTab;

