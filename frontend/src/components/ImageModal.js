import React from 'react';
import styles from './ImageModal.module.css';

function ImageModal({ imageUrl, onClose }) {
    if (!imageUrl) {
        return null; // Не рендерим ничего, если нет URL
    }

    // Обработчик клика по фону (оверлею)
    const handleBackdropClick = (event) => {
        // Закрываем только если клик был именно по фону, а не по картинке
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
            <div className={styles.modalContent}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>
                <img src={imageUrl} alt="Enlarged generation" className={styles.modalImage} />
            </div>
        </div>
    );
}

export default ImageModal; 