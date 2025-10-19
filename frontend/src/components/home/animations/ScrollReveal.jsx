import React from 'react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import styles from './ScrollReveal.module.css';

const ScrollReveal = ({ 
    children, 
    animation = 'fadeUp', 
    delay = 0,
    className = '' 
}) => {
    const { ref, isVisible, style } = useScrollAnimation(animation, delay);

    return (
        <div
            ref={ref}
            className={`${styles.scrollReveal} ${isVisible ? styles.visible : ''} ${styles[animation]} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
};

export default ScrollReveal;

