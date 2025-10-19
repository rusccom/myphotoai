import React from 'react';
import AnimatedCard from './animations/AnimatedCard';
import styles from './FeatureCard.module.css';

const FeatureCard = ({ icon, title, description, comingSoon = false, scrollToId = null, delay = 0 }) => {
    const handleClick = () => {
        if (comingSoon || !scrollToId) {
            return;
        }
        
        const element = document.getElementById(scrollToId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div onClick={handleClick} style={{ height: '100%' }}>
            <AnimatedCard 
                glassEffect={true} 
                hoverLift={!comingSoon}
                gradientBorder={true}
                className={`${styles.featureCard} ${comingSoon ? styles.disabled : ''}`}
            >
                {comingSoon && (
                    <div className={styles.comingSoonBadge}>
                        Coming Soon
                    </div>
                )}
                
                <div className={styles.iconWrapper}>
                    <div className={styles.iconGlow}></div>
                    <div className={styles.icon}>
                        {icon}
                    </div>
                </div>

                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>

                <div 
                    className={`${styles.learnMore} ${comingSoon ? styles.learnMoreDisabled : ''}`}
                >
                    <span>{comingSoon ? 'Coming Soon' : 'Learn More'}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M8.293 2.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L10.586 8H3a1 1 0 110-2h7.586L8.293 3.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </AnimatedCard>
        </div>
    );
};

export default FeatureCard;

