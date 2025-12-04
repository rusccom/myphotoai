import React from 'react';
import styles from './PresetTab.module.css';

const PresetCard = ({ preset, onClick }) => {
    return (
        <div className={styles.presetCard} onClick={onClick}>
            <div className={styles.presetImage}>
                {preset.signed_url ? (
                    <img src={preset.signed_url} alt={preset.name} />
                ) : (
                    <div className={styles.presetPlaceholder}>
                        <span>✨</span>
                    </div>
                )}
                <div className={styles.presetOverlay}>
                    <button className={styles.generateBtn}>Generate</button>
                </div>
            </div>
            <div className={styles.presetInfo}>
                <h4 className={styles.presetName}>{preset.name}</h4>
                <span className={styles.presetCategory}>{preset.category_name}</span>
            </div>
        </div>
    );
};

export default PresetCard;
