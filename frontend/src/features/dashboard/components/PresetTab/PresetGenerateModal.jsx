import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startGeneration, GENERATION_TYPES } from '../../../../services/api';
import styles from './PresetGenerateModal.module.css';

const PresetGenerateModal = ({ preset, models, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);

    // Filter ready models
    const readyModels = models?.filter(m => m.status === 'ready') || [];
    const hasReadyModels = readyModels.length > 0;

    // Pre-select last used model or first ready model
    useEffect(() => {
        if (hasReadyModels) {
            const lastUsedId = localStorage.getItem('lastUsedModelId');
            const lastUsedModel = readyModels.find(m => m.id === parseInt(lastUsedId));
            
            if (lastUsedModel) {
                setSelectedModelId(lastUsedModel.id);
            } else {
                setSelectedModelId(readyModels[0].id);
            }
        }
    }, [readyModels, hasReadyModels]);

    const handleGenerate = async () => {
        if (!selectedModelId) return;
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const result = await startGeneration(GENERATION_TYPES.MODEL_PHOTO, {
                prompt: preset.prompt,
                aiModelId: selectedModelId,
                aspectRatio: '3:4',
                numImages: 1,
            });
            // Store last used model ID
            localStorage.setItem('lastUsedModelId', selectedModelId);
            onSuccess(result);
        } catch (err) {
            setError(err.message || 'Generation failed');
            setIsGenerating(false);
        }
    };

    const handleCreateModel = () => {
        onClose();
        navigate('/create-model');
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>×</button>
                
                <div className={styles.presetPreview}>
                    {preset.signed_url ? (
                        <img src={preset.signed_url} alt={preset.name} />
                    ) : (
                        <div className={styles.placeholder}>✨</div>
                    )}
                </div>

                <div className={styles.content}>
                    <h3 className={styles.title}>{preset.name}</h3>
                    <p className={styles.prompt}>{preset.prompt}</p>

                    {hasReadyModels ? (
                        <>
                            <div className={styles.modelSelect}>
                                <label>Select your model:</label>
                                <div className={styles.modelList}>
                                    {readyModels.map(model => (
                                        <div
                                            key={model.id}
                                            className={`${styles.modelItem} ${selectedModelId === model.id ? styles.selected : ''}`}
                                            onClick={() => setSelectedModelId(model.id)}
                                        >
                                            <div className={styles.modelPreview}>
                                                {model.signed_preview_url ? (
                                                    <img src={model.signed_preview_url} alt={model.name} />
                                                ) : (
                                                    <span>👤</span>
                                                )}
                                            </div>
                                            <div className={styles.modelInfo}>
                                                <span className={styles.modelName}>{model.name}</span>
                                                <span className={styles.modelStatus}>Ready</span>
                                            </div>
                                            {selectedModelId === model.id && (
                                                <span className={styles.checkmark}>✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && <p className={styles.error}>{error}</p>}

                            <button
                                className={styles.generateBtn}
                                onClick={handleGenerate}
                                disabled={isGenerating || !selectedModelId}
                            >
                                {isGenerating ? 'Generating...' : 'Generate Photo'}
                            </button>
                        </>
                    ) : (
                        <div className={styles.noModels}>
                            <p>You need to create an AI model first to generate photos from presets.</p>
                            <button className={styles.createModelBtn} onClick={handleCreateModel}>
                                Create Your Model
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PresetGenerateModal;
