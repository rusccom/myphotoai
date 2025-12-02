import React, { useRef, useEffect, useState } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './LivePhoto.module.css';

// R2 base URL for landing media (required in production)
const R2_BASE = process.env.REACT_APP_R2_URL;

// Генерация путей к видео для 5 блоков в R2
const VIDEOS = [1, 2, 3, 4, 5].map(num => ({
    id: num,
    src: `${R2_BASE}/landing/live-photo/videos/${num}.mp4`,
}));

// Placeholder для отсутствующих видео (формат 9:16)
const PLACEHOLDER = 'https://placehold.co/360x640/1a1a1a/f59e0b?text=Live+Photo';

function LivePhoto() {
    const videoRefs = useRef([]);
    const sectionRef = useRef(null);
    const [videoErrors, setVideoErrors] = useState({});

    // Intersection Observer для автоматического воспроизведения видео при скролле
    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.3, // Запускать при 30% видимости
        };

        const handleIntersection = (entries) => {
            entries.forEach((entry) => {
                if (entry.target.tagName === 'VIDEO') {
                    const video = entry.target;
                    if (entry.isIntersecting) {
                        // Воспроизведение при появлении в области видимости
                        video.play().catch(err => {
                            console.log('Autoplay prevented:', err);
                        });
                    } else {
                        // Пауза при выходе из области видимости
                        video.pause();
                    }
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, options);

        // Наблюдение за всеми видео элементами
        videoRefs.current.forEach(video => {
            if (video) {
                observer.observe(video);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const handleVideoError = (videoId) => {
        setVideoErrors(prev => ({
            ...prev,
            [videoId]: true
        }));
    };

    const hasError = (videoId) => {
        return videoErrors[videoId];
    };

    return (
        <section id="live-photo" ref={sectionRef} className={styles.section}>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Bring Your Photos to Life{' '}
                            <GradientText animated={true}>with AI</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            Transform static photos into living videos — add motion and emotion to every frame
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.videosGrid}>
                    {VIDEOS.map((video, index) => {
                        const delay = index * 100;
                        // Шахматный порядок: четные индексы (0,2,4) - вверху, нечетные (1,3) - внизу
                        const isEven = index % 2 === 0;

                        return (
                            <ScrollReveal 
                                key={video.id}
                                animation="fadeUp" 
                                delay={delay}
                            >
                                <div className={`${styles.videoWrapper} ${isEven ? styles.even : styles.odd}`}>
                                    {!hasError(video.id) ? (
                                        <video
                                            ref={el => videoRefs.current[index] = el}
                                            className={styles.video}
                                            src={video.src}
                                            loop
                                            muted
                                            playsInline
                                            preload="auto"
                                            onError={() => handleVideoError(video.id)}
                                        />
                                    ) : (
                                        <div className={styles.placeholder}>
                                            <img 
                                                src={PLACEHOLDER} 
                                                alt={`Live photo ${video.id}`}
                                                className={styles.placeholderImage}
                                            />
                                        </div>
                                    )}
                                    
                                    <div className={styles.videoOverlay}>
                                        <div className={styles.badge}>
                                            <span className={styles.badgeIcon}>✨</span>
                                            <span>Live Photo</span>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default LivePhoto;

