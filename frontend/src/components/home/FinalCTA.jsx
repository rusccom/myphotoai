import React from 'react';
import { Link } from 'react-router-dom';
import GradientText from './animations/GradientText';
import styles from './FinalCTA.module.css';

function FinalCTA() {
    return (
        <section className={styles.section}>
            <div className={styles.backgroundMesh}></div>
            
            {/* Floating elements */}
            <div className={styles.floatingElements}>
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={i} 
                        className={styles.floatingElement}
                        style={{
                            left: `${15 + i * 15}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${4 + i * 0.5}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className={`container ${styles.ctaContainer}`}>
                <div className={styles.content}>
                    <h2 className={styles.title}>
                        Sign up and try it{' '}
                        <GradientText animated={true}>for free</GradientText>
                    </h2>
                    <p className={styles.subtitle}>
                        Create professional content with AI at no cost
                    </p>

                    <div className={styles.ctaButtons}>
                        <Link to="/register" className={styles.primaryButton}>
                            <span>Start Free</span>
                            <div className={styles.buttonGlow}></div>
                        </Link>
                    </div>

                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <div className={styles.statNumber}>10K+</div>
                            <div className={styles.statLabel}>Users</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statNumber}>1M+</div>
                            <div className={styles.statLabel}>Generations</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statNumber}>4.9★</div>
                            <div className={styles.statLabel}>Rating</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default FinalCTA;

