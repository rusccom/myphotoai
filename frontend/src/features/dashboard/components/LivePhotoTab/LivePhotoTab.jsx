import React from 'react';
import { Link } from 'react-router-dom';
import styles from './LivePhotoTab.module.css';

const LivePhotoTab = () => {
    return (
        <div className={styles.container}>
            <div className={styles.comingSoon}>
                <div className={styles.icon}>🎬</div>
                <h3>Live Photo Coming Soon</h3>
                <p>
                    Transform your AI-generated images into dynamic live photos.
                </p>
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>✨</span>
                        <span>Animated portraits</span>
                    </div>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>🎭</span>
                        <span>Realistic expressions</span>
                    </div>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>🎨</span>
                        <span>Multiple styles</span>
                    </div>
                </div>
                <p className={styles.notifyText}>
                    Want to be notified when this feature launches?{' '}
                    <Link to="/account" className={styles.link}>
                        Update your preferences
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LivePhotoTab;

