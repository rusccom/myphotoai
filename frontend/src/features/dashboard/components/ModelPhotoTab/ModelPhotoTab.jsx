import React, { useState } from 'react';
import NumImagesSelect from '../../../../components/NumImagesSelect';
import UniversalSubmitButton from '../../../../components/UniversalSubmitButton';
import CustomSelect from '../../../../components/CustomSelect';
import ModelManagement from '../ModelManagement/ModelManagement';
import { Link } from 'react-router-dom';
import styles from './ModelPhotoTab.module.css';

const STYLE_OPTIONS = ['Photorealistic', 'Fashion Magazine', 'Vintage Film', 'Dreamy Look', 'Golden Hour', 'Minimalist Style', 'Noir Film', 'Cyberpunk City', 'Fantasy Art', 'Gothic Vibe', 'Pop Art'];
const CAMERA_OPTIONS = ['Close-up', 'Medium shot', 'Full shot', 'From above', 'From below'];
const EMOTION_OPTIONS = ['Smiling', 'Serious', 'Happy', 'Sad', 'Confident', 'Neutral', 'Scared'];
const LIGHT_OPTIONS = ['Studio Light', 'Ring Light', 'Neon Light', 'Dramatic Shadow'];
const ASPECT_RATIO_OPTIONS = ['3:4', '9:16', '1:1', '4:3', '16:9'];
const ASPECT_RATIO_LABELS = {
    '3:4': '3:4 Portrait (Instagram)',
    '9:16': '9:16 (Stories/Reels)',
    '1:1': '1:1 Square',
    '4:3': '4:3 Landscape',
    '16:9': '16:9 Widescreen'
};

const ModelPhotoTab = ({ 
    models,
    modelsLoading,
    selectedModelId,
    setSelectedModelId,
    onSubmit,
    isSubmitting,
    error,
    costs 
}) => {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('');
    const [cameraAngle, setCameraAngle] = useState('');
    const [emotion, setEmotion] = useState('');
    const [light, setLight] = useState('');
    const [finetuneStrength, setFinetuneStrength] = useState(1.1);
    const [aspectRatio, setAspectRatio] = useState('3:4');
    const [modelNumImages, setModelNumImages] = useState(2);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            prompt,
            aiModelId: selectedModelId,
            aspectRatio,
            num_images: modelNumImages,
            finetuneStrength: parseFloat(finetuneStrength),
            style,
            cameraAngle,
            emotion,
            light,
        });
        setPrompt('');
    };

    const readyModels = models.filter(m => m.status === 'ready');
    const selectedModel = models.find(m => m.id === selectedModelId);

    if (readyModels.length === 0) {
        return (
            <div className={styles.createModelPrompt}>
                <h3>No Models Available</h3>
                <p>Create your first AI model to start generating photos.</p>
                <Link to="/create-model" className={styles.createModelButton}>
                    Create Model
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.generationForm}>
            {/* Model Selection Section */}
            <ModelManagement
                models={models}
                modelsLoading={modelsLoading}
                selectedModelId={selectedModelId}
                onSelectModel={setSelectedModelId}
            />

            {/* Generation Form - show only if model is selected */}
            {selectedModelId && selectedModel && selectedModel.status === 'ready' ? (
                <>
                    <div className={styles.divider}></div>
                    <h3>Generate with {selectedModel.name}</h3>

            <div>
                <label>Prompt:</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the scene you want to generate..."
                    required
                    disabled={isSubmitting}
                />
            </div>

            <div className={styles.selectorsGrid}>
                <CustomSelect
                    label="Style"
                    value={style}
                    onChange={setStyle}
                    options={STYLE_OPTIONS}
                    disabled={isSubmitting}
                    allowEmpty={true}
                    emptyLabel="None"
                />

                <CustomSelect
                    label="Camera Angle"
                    value={cameraAngle}
                    onChange={setCameraAngle}
                    options={CAMERA_OPTIONS}
                    disabled={isSubmitting}
                    allowEmpty={true}
                    emptyLabel="None"
                />

                <CustomSelect
                    label="Emotion"
                    value={emotion}
                    onChange={setEmotion}
                    options={EMOTION_OPTIONS}
                    disabled={isSubmitting}
                    allowEmpty={true}
                    emptyLabel="None"
                />

                <CustomSelect
                    label="Lighting"
                    value={light}
                    onChange={setLight}
                    options={LIGHT_OPTIONS}
                    disabled={isSubmitting}
                    allowEmpty={true}
                    emptyLabel="None"
                />

                <CustomSelect
                    label="Aspect Ratio"
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    options={ASPECT_RATIO_OPTIONS.map(opt => ({
                        value: opt,
                        label: ASPECT_RATIO_LABELS[opt]
                    }))}
                    disabled={isSubmitting}
                    allowEmpty={false}
                />

                <NumImagesSelect
                    label="Number of Images"
                    value={modelNumImages}
                    onChange={setModelNumImages}
                    disabled={isSubmitting}
                />
            </div>

            <div>
                <label>
                    Finetune Strength: {finetuneStrength}
                </label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={finetuneStrength}
                    onChange={(e) => setFinetuneStrength(e.target.value)}
                    disabled={isSubmitting}
                    className={styles.rangeInput}
                />
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

                    <UniversalSubmitButton
                        isSubmitting={isSubmitting}
                        actionCost={costs?.model_photo || 0}
                        actionName="Generate"
                        submitText="Generate Images"
                    />
                </>
            ) : (
                <div className={styles.selectModelPrompt}>
                    <p>👆 Please select a model above to start generating</p>
                </div>
            )}
        </form>
    );
};

export default ModelPhotoTab;

