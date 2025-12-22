import React, { useState } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './ModelGeneration.module.css';

// R2 base URL for landing media (required in production)
const R2_BASE = process.env.REACT_APP_R2_URL;

// Пути к изображениям в R2 (первый блок)
const MAIN_IMAGE = `${R2_BASE}/landing/model-generation/main/main.jpg`;
const GRID_IMAGES = Array.from({ length: 12 }, (_, i) => 
    `${R2_BASE}/landing/model-generation/grid/image-${i + 1}.jpg`
);

// Пути к изображениям в R2 (второй блок - как в Edit Photo)
const MAIN_IMAGE_2 = `${R2_BASE}/landing/model-generation/main2/main.jpg`;
const GRID_IMAGES_2 = Array.from({ length: 12 }, (_, i) => 
    `${R2_BASE}/landing/model-generation/grid2/image-${i + 1}.jpg`
);

// Хаотичные задержки для анимации
const RANDOM_DELAYS = [0, 150, 100, 300, 50, 250, 200, 120, 180, 80, 220, 160];

// Placeholder для отсутствующих изображений (формат 3:4)
const PLACEHOLDER_MAIN = 'https://placehold.co/600x800/1a1a1a/8b5cf6?text=Main+Photo';
const PLACEHOLDER_GRID = 'https://placehold.co/300x400/1a1a1a/ec4899?text=Generated';

function ModelGeneration() {
    const [mainImageError, setMainImageError] = useState(false);
    const [gridImageErrors, setGridImageErrors] = useState(
        Array(12).fill(false)
    );
    const [mainImageError2, setMainImageError2] = useState(false);
    const [gridImageErrors2, setGridImageErrors2] = useState(
        Array(12).fill(false)
    );

    const handleMainImageError = () => {
        setMainImageError(true);
    };

    const handleGridImageError = (index) => {
        setGridImageErrors(prev => {
            const newErrors = [...prev];
            newErrors[index] = true;
            return newErrors;
        });
    };

    const handleMainImageError2 = () => {
        setMainImageError2(true);
    };

    const handleGridImageError2 = (index) => {
        setGridImageErrors2(prev => {
            const newErrors = [...prev];
            newErrors[index] = true;
            return newErrors;
        });
    };

    return (
        <section id="model-generation" className={styles.section}>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Photo Generation with{' '}
                            <GradientText animated={true}>Trained Model</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            One trained model — infinite possibilities for creating unique content
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.contentWrapper}>
                    {/* Большое фото слева */}
                    <ScrollReveal animation="fadeLeft" delay={200}>
                        <div className={styles.mainImageContainer}>
                            <div className={styles.mainImageWrapper}>
                                <img
                                    src={mainImageError ? PLACEHOLDER_MAIN : MAIN_IMAGE}
                                    alt="Main generated photo"
                                    className={styles.mainImage}
                                    onError={handleMainImageError}
                                />
                                <div className={styles.mainImageOverlay}>
                                    <div className={styles.badge}>
                                        <span className={styles.badgeIcon}>✨</span>
                                        <span>Main Result</span>
                                    </div>
                                </div>
                                <div className={styles.labelBadge}>Original</div>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Сетка 3x3 справа */}
                    <div className={styles.gridContainer}>
                        {GRID_IMAGES.map((imagePath, index) => {
                            // Определяем, в какой колонке находится элемент (для 4 колонок)
                            const column = index % 4;
                            // Четные колонки (1 и 3) должны быть смещены
                            const isOffset = column === 1 || column === 3;
                            
                            return (
                                <ScrollReveal
                                    key={index}
                                    animation="scale"
                                    delay={400 + RANDOM_DELAYS[index]}
                                >
                                    <div className={`${styles.gridItem} ${isOffset ? styles.gridItemOffset : ''}`}>
                                        <div className={styles.gridImageWrapper}>
                                            <img
                                                src={gridImageErrors[index] ? PLACEHOLDER_GRID : imagePath}
                                                alt={`Generated photo ${index + 1}`}
                                                className={styles.gridImage}
                                                onError={() => handleGridImageError(index)}
                                            />
                                            <div className={styles.gridLabelBadge}>Generated</div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                </div>

                {/* Второй блок - как Edit Photo (сетка слева, main справа) */}
                <div className={styles.contentWrapperReverse}>
                    {/* Сетка 4x3 слева */}
                    <div className={styles.gridContainer}>
                        {GRID_IMAGES_2.map((imagePath, index) => {
                            const column = index % 4;
                            const isOffset = column === 1 || column === 3;
                            
                            return (
                                <ScrollReveal
                                    key={index}
                                    animation="scale"
                                    delay={200 + RANDOM_DELAYS[index]}
                                >
                                    <div className={`${styles.gridItem} ${isOffset ? styles.gridItemOffset : ''}`}>
                                        <div className={styles.gridImageWrapper}>
                                            <img
                                                src={gridImageErrors2[index] ? PLACEHOLDER_GRID : imagePath}
                                                alt={`Generated photo ${index + 1}`}
                                                className={styles.gridImage}
                                                onError={() => handleGridImageError2(index)}
                                            />
                                            <div className={styles.gridLabelBadge}>Generated</div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            );
                        })}
                    </div>

                    {/* Большое фото справа */}
                    <ScrollReveal animation="fadeRight" delay={400}>
                        <div className={styles.mainImageContainer}>
                            <div className={styles.mainImageWrapper}>
                                <img
                                    src={mainImageError2 ? PLACEHOLDER_MAIN : MAIN_IMAGE_2}
                                    alt="Main generated photo"
                                    className={styles.mainImage}
                                    onError={handleMainImageError2}
                                />
                                <div className={styles.mainImageOverlay}>
                                    <div className={styles.badgeRight}>
                                        <span className={styles.badgeIcon}>✨</span>
                                        <span>Main Result</span>
                                    </div>
                                </div>
                                <div className={styles.labelBadge}>Original</div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </div>
        </section>
    );
}

export default ModelGeneration;

