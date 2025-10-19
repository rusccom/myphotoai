import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ModelManagement.module.css';

const ModelManagement = ({ 
    models, 
    modelsLoading, 
    selectedModelId, 
    onSelectModel 
}) => {
    if (modelsLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Your Models</h3>
                </div>
                <p className={styles.loadingText}>Loading models...</p>
            </div>
        );
    }

    if (!models || models.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Your Models</h3>
                </div>
                <div className={styles.emptyState}>
                    <h4>No Models Found</h4>
                    <p>Create your first personalized AI model to start generating images.</p>
                    <Link to="/create-model" className={styles.createButton}>
                        Create First Model
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Your Models</h3>
                <Link to="/create-model" className={styles.addButton} title="Add new model">
                    + Add
                </Link>
            </div>

            <div className={styles.modelList}>
                {models.map(model => {
                    const isReady = model.status === 'ready';
                    const isTraining = model.status === 'training';
                    const isFailed = model.status === 'failed';
                    const isSelected = selectedModelId === model.id && isReady;

                    const previewUrl = model.signed_preview_url;
                    const modelName = model?.name || 'N/A';
                    const encodedName = encodeURIComponent(modelName);
                    const fallbackUrl = `https://via.placeholder.com/150/8B5CF6/FFFFFF?text=Model+${encodedName}`;

                    const handleClick = () => {
                        if (isReady) {
                            onSelectModel(model.id);
                        }
                    };

                    return (
                        <div
                            key={model.id}
                            className={`
                                ${styles.modelCard}
                                ${isSelected ? styles.selected : ''}
                                ${isTraining ? styles.training : ''}
                                ${isFailed ? styles.failed : ''}
                                ${!isReady ? styles.disabled : ''}
                            `}
                            onClick={handleClick}
                            title={
                                isReady 
                                    ? `Select model ${modelName}` 
                                    : `Model ${modelName} is ${model.status}`
                            }
                        >
                            {isTraining && (
                                <div className={styles.overlay}>
                                    <span className={styles.spinner}></span>
                                    <span className={styles.statusText}>Training...</span>
                                </div>
                            )}

                            {isFailed && (
                                <div className={styles.overlay}>
                                    <span className={styles.statusText}>❌ Failed</span>
                                </div>
                            )}

                            <img
                                src={previewUrl || fallbackUrl}
                                alt={`Model ${modelName}`}
                                className={styles.modelImage}
                                style={{ opacity: isTraining || isFailed ? 0.3 : 1 }}
                                onError={(e) => { e.target.src = fallbackUrl; }}
                            />

                            <div className={styles.modelInfo}>
                                <p className={styles.modelName}>{modelName}</p>
                                {model.concept_type && (
                                    <span className={styles.conceptType}>
                                        {model.concept_type}
                                    </span>
                                )}
                            </div>

                            {isSelected && (
                                <div className={styles.selectedBadge}>✓</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ModelManagement;

