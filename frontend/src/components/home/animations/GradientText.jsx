import React from 'react';
import styles from './GradientText.module.css';

const GradientText = ({ children, animated = false, className = '' }) => {
    return (
        <span className={`${styles.gradientText} ${animated ? styles.animated : ''} ${className}`}>
            {children}
        </span>
    );
};

export default GradientText;

