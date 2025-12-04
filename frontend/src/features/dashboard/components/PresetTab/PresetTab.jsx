import React, { useState } from 'react';
import PresetCard from './PresetCard';
import PresetGenerateModal from './PresetGenerateModal';
import styles from './PresetTab.module.css';

const PresetTab = ({ categories, presets, isLoading, models, onGenerationStart, updateUser }) => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const filteredPresets = activeCategory === 'all'
        ? presets
        : presets.filter(p => p.category_id === activeCategory);

    const handlePresetClick = (preset) => {
        setSelectedPreset(preset);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedPreset(null);
    };

    const handleGenerationSuccess = (result) => {
        // Update user balance
        if (result.new_balance !== undefined && updateUser) {
            updateUser({ balance_points: result.new_balance });
        }
        // Notify parent about new generation
        if (onGenerationStart) {
            onGenerationStart(result);
        }
        handleModalClose();
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading presets...</div>
            </div>
        );
    }

    if (presets.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>✨</span>
                    <p>No presets available yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Category Filter */}
            <div className={styles.categoryFilter}>
                <button
                    className={`${styles.categoryBtn} ${activeCategory === 'all' ? styles.active : ''}`}
                    onClick={() => setActiveCategory('all')}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`${styles.categoryBtn} ${activeCategory === cat.id ? styles.active : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Presets Grid */}
            <div className={styles.presetsGrid}>
                {filteredPresets.map(preset => (
                    <PresetCard
                        key={preset.id}
                        preset={preset}
                        onClick={() => handlePresetClick(preset)}
                    />
                ))}
            </div>

            {/* Generate Modal */}
            {showModal && selectedPreset && (
                <PresetGenerateModal
                    preset={selectedPreset}
                    models={models}
                    onClose={handleModalClose}
                    onSuccess={handleGenerationSuccess}
                />
            )}
        </div>
    );
};

export default PresetTab;
