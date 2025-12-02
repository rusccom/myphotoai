import React, { useState } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './ClothingTryOn.module.css';

// R2 base URL for landing media (required in production)
const R2_BASE = process.env.REACT_APP_R2_URL;

// Генерация путей к изображениям для 4 блоков в R2
const BLOCKS = [1, 2, 3, 4].map(blockNum => ({
    id: blockNum,
    images: {
        left1: `${R2_BASE}/landing/clothing-try-on/${blockNum}/1.jpg`,
        left2: `${R2_BASE}/landing/clothing-try-on/${blockNum}/2.jpg`,
        right: `${R2_BASE}/landing/clothing-try-on/${blockNum}/3.jpg`
    }
}));

// Placeholder для отсутствующих изображений (формат 3:4)
const PLACEHOLDER = 'https://placehold.co/300x400/1a1a1a/f59e0b?text=Try+On';

function ClothingTryOn() {
    // Состояние для отслеживания ошибок загрузки изображений
    const [imageErrors, setImageErrors] = useState({});

    const handleImageError = (blockId, imageKey) => {
        setImageErrors(prev => ({
            ...prev,
            [`${blockId}-${imageKey}`]: true
        }));
    };

    const getImageSrc = (blockId, imageKey, originalSrc) => {
        const errorKey = `${blockId}-${imageKey}`;
        return imageErrors[errorKey] ? PLACEHOLDER : originalSrc;
    };

    return (
        <section id="clothing-try-on" className={styles.section}>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Virtual Clothing Try-On{' '}
                            <GradientText animated={true}>with AI</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            Virtual try-on for any clothing — see how clothes fit on you without leaving home
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.blocksGrid}>
                    {BLOCKS.map((block, index) => (
                        <ScrollReveal 
                            key={block.id} 
                            animation="fadeUp" 
                            delay={index * 150}
                        >
                            <div className={styles.block}>
                                {/* Левая колонка - 2 фото вертикально */}
                                <div className={styles.leftColumn}>
                                    <div className={styles.imageWrapper}>
                                        <img
                                            src={getImageSrc(block.id, 'left1', block.images.left1)}
                                            alt={`Before try-on ${block.id}`}
                                            className={styles.image}
                                            onError={() => handleImageError(block.id, 'left1')}
                                        />
                                        <div className={styles.imageOverlay}>
                                            <div className={styles.badge}>
                                                <span className={styles.badgeIcon}>👤</span>
                                                <span>Before</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.imageWrapper}>
                                        <img
                                            src={getImageSrc(block.id, 'left2', block.images.left2)}
                                            alt={`Clothing ${block.id}`}
                                            className={styles.image}
                                            onError={() => handleImageError(block.id, 'left2')}
                                        />
                                        <div className={styles.imageOverlay}>
                                            <div className={styles.badge}>
                                                <span className={styles.badgeIcon}>👕</span>
                                                <span>Clothing</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Правая колонка - 1 большое фото */}
                                <div className={styles.rightColumn}>
                                    <div className={styles.mainImageWrapper}>
                                        <img
                                            src={getImageSrc(block.id, 'right', block.images.right)}
                                            alt={`After try-on ${block.id}`}
                                            className={styles.mainImage}
                                            onError={() => handleImageError(block.id, 'right')}
                                        />
                                        <div className={styles.mainImageOverlay}>
                                            <div className={styles.mainBadge}>
                                                <span className={styles.badgeIcon}>✨</span>
                                                <span>Result</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default ClothingTryOn;

