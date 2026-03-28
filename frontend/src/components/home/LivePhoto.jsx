import React, { useEffect, useRef, useState } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './LivePhoto.module.css';

const R2_BASE = process.env.REACT_APP_R2_URL;
const VIDEOS = [1, 2, 3, 4, 5].map((num) => ({
    id: num,
    src: `${R2_BASE}/landing/live-photo/videos/${num}.mp4`,
}));
const PLACEHOLDER = 'https://placehold.co/360x640/1a1a1a/f59e0b?text=Live+Photo';

function LivePhoto() {
    const videoRefs = useRef([]);
    const sectionRef = useRef(null);
    const [videoErrors, setVideoErrors] = useState({});

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.target.tagName !== 'VIDEO') {
                    return;
                }

                if (entry.isIntersecting) {
                    entry.target.play().catch((error) => {
                        console.log('Autoplay prevented:', error);
                    });
                    return;
                }

                entry.target.pause();
            });
        }, {
            root: null,
            rootMargin: '0px',
            threshold: 0.3,
        });

        videoRefs.current.forEach((video) => {
            if (video) {
                observer.observe(video);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const handleVideoError = (videoId) => {
        setVideoErrors((prev) => ({
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
                            AI Motion <GradientText animated={true}>Preview</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            Animate portraits and generated images with short motion clips.
                            This feature is in preview and will launch inside the dashboard soon.
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.videosGrid}>
                    {VIDEOS.map((video, index) => {
                        const delay = index * 100;
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
                                            ref={(element) => {
                                                videoRefs.current[index] = element;
                                            }}
                                            className={styles.video}
                                            src={video.src}
                                            loop
                                            muted
                                            playsInline
                                            preload="metadata"
                                            onError={() => handleVideoError(video.id)}
                                        />
                                    ) : (
                                        <div className={styles.placeholder}>
                                            <img
                                                src={PLACEHOLDER}
                                                alt={`AI motion preview fallback ${video.id}`}
                                                className={styles.placeholderImage}
                                            />
                                        </div>
                                    )}

                                    <div className={styles.videoOverlay}>
                                        <div className={styles.badge}>
                                            <span className={styles.badgeIcon}>{'\u2728'}</span>
                                            <span>Preview</span>
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
