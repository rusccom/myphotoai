import React, { useState } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './PhotoEditing.module.css';

// R2 base URL for landing media
const R2_BASE = process.env.REACT_APP_R2_URL;

// 5 блоков, каждый с оригиналом и 4 результатами
const BLOCKS = [1, 2, 3, 4, 5].map(blockNum => ({
    id: blockNum,
    original: `${R2_BASE}/landing/photo-editing/${blockNum}/original.jpg`,
    results: [1, 2, 3, 4].map(i => 
        `${R2_BASE}/landing/photo-editing/${blockNum}/${i}.jpg`
    )
}));

// Placeholder для отсутствующих изображений
const PLACEHOLDER_ORIGINAL = 'https://placehold.co/300x400/1a1a1a/10b981?text=Original';
const PLACEHOLDER_RESULT = 'https://placehold.co/300x400/1a1a1a/06b6d4?text=Result';

function PhotoEditing() {
    const [imageErrors, setImageErrors] = useState({});

    const handleImageError = (blockId, imageKey) => {
        setImageErrors(prev => ({
            ...prev,
            [`${blockId}-${imageKey}`]: true
        }));
    };

    const getImageSrc = (blockId, imageKey, originalSrc, isOriginal) => {
        const errorKey = `${blockId}-${imageKey}`;
        if (imageErrors[errorKey]) {
            return isOriginal ? PLACEHOLDER_ORIGINAL : PLACEHOLDER_RESULT;
        }
        return originalSrc;
    };

    return (
        <section id="photo-editing" className={styles.section}>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Edit Photos{' '}
                            <GradientText animated={true}>However You Want</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            One photo — endless creative possibilities with AI editing
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.blocksContainer}>
                    {BLOCKS.map((block, index) => (
                        <ScrollReveal 
                            key={block.id} 
                            animation="fadeUp" 
                            delay={index * 100}
                        >
                            <div className={styles.transformCard}>
                                {/* Оригинал */}
                                <div className={styles.imageItem}>
                                    <div className={styles.imageWrapper}>
                                        <img
                                            src={getImageSrc(
                                                block.id, 
                                                'original', 
                                                block.original, 
                                                true
                                            )}
                                            alt={`Original photo ${block.id}`}
                                            className={styles.image}
                                            onError={() => handleImageError(
                                                block.id, 
                                                'original'
                                            )}
                                        />
                                        <div className={styles.originalBadge}>
                                            Original
                                        </div>
                                    </div>
                                </div>

                                {/* Простой разделитель */}
                                <div className={styles.divider}>
                                    <span className={styles.dot}></span>
                                </div>

                                {/* 4 результата */}
                                {block.results.map((resultSrc, i) => (
                                    <div key={i} className={styles.imageItem}>
                                        <div className={styles.imageWrapper}>
                                            <img
                                                src={getImageSrc(
                                                    block.id, 
                                                    `result-${i}`, 
                                                    resultSrc, 
                                                    false
                                                )}
                                                alt={`Result ${i + 1}`}
                                                className={styles.image}
                                                onError={() => handleImageError(
                                                    block.id, 
                                                    `result-${i}`
                                                )}
                                            />
                                            <div className={styles.resultBadge}>
                                                {i + 1}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default PhotoEditing;
