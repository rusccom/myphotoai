import React, { useState } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './PhotoEditing.module.css';

// Пути к изображениям
const MAIN_IMAGE = '/media/photo-editing/main/main.jpg';
const GRID_IMAGES = Array.from({ length: 12 }, (_, i) => 
    `/media/photo-editing/grid/image-${i + 1}.jpg`
);

// Хаотичные задержки для анимации
const RANDOM_DELAYS = [0, 150, 100, 300, 50, 250, 200, 120, 180, 80, 220, 160];

// Placeholder для отсутствующих изображений (формат 3:4)
const PLACEHOLDER_MAIN = 'https://placehold.co/600x800/1a1a1a/10b981?text=Main+Photo';
const PLACEHOLDER_GRID = 'https://placehold.co/300x400/1a1a1a/06b6d4?text=Edited';

function PhotoEditing() {
    const [mainImageError, setMainImageError] = useState(false);
    const [gridImageErrors, setGridImageErrors] = useState(
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

    return (
        <section id="photo-editing" className={styles.section}>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Edit photos{' '}
                            <GradientText animated={true}>however you want</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            Powerful editing tools to bring any creative idea to life
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.contentWrapper}>
                    {/* Сетка 4x3 слева */}
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
                                    delay={200 + RANDOM_DELAYS[index]}
                                >
                                    <div className={`${styles.gridItem} ${isOffset ? styles.gridItemOffset : ''}`}>
                                        <div className={styles.gridImageWrapper}>
                                            <img
                                                src={gridImageErrors[index] ? PLACEHOLDER_GRID : imagePath}
                                                alt={`Edited photo ${index + 1}`}
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

                    {/* Большое фото справа */}
                    <ScrollReveal animation="fadeRight" delay={400}>
                        <div className={styles.mainImageContainer}>
                            <div className={styles.mainImageWrapper}>
                                <img
                                    src={mainImageError ? PLACEHOLDER_MAIN : MAIN_IMAGE}
                                    alt="Main edited photo"
                                    className={styles.mainImage}
                                    onError={handleMainImageError}
                                />
                                <div className={styles.mainImageOverlay}>
                                    <div className={styles.badge}>
                                        <span className={styles.badgeIcon}>🎨</span>
                                        <span>Final Result</span>
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

export default PhotoEditing;

