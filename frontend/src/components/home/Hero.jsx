import React from 'react';
import { Link } from 'react-router-dom';
import GradientText from './animations/GradientText';
import styles from './Hero.module.css';

function Hero() {
    return (
        <section className={styles.hero}>
            <div
                className={styles.heroBackground}
                style={{
                    backgroundImage: `url(${process.env.PUBLIC_URL}/media/hero-background.jpg)`
                }}
            ></div>

            <div className={`container ${styles.heroContainer}`}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        <span>Create Your</span>
                        <GradientText animated={true}>
                            {' '}Personal AI Model{' '}
                        </GradientText>
                        <span>from Photos</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Generate photorealistic portraits and headshots, edit images
                        with prompts, and try on outfits with one trained model
                    </p>

                    <div className={styles.heroCta}>
                        <Link to="/register" className={`${styles.button} ${styles.buttonPrimary}`}>
                            <span>Start Free</span>
                            <svg className={styles.buttonIcon} width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </Link>
                        <a href="#features" className={`${styles.button} ${styles.buttonSecondary}`}>
                            Learn More
                        </a>
                    </div>
                </div>
            </div>

            <div className={styles.scrollIndicator}>
                <div className={styles.mouse}>
                    <div className={styles.wheel}></div>
                </div>
                <p>Scroll to explore</p>
            </div>
        </section>
    );
}

export default Hero;
