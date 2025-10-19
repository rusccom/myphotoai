import React, { useState } from 'react';
import styles from './AnimatedCard.module.css';

const AnimatedCard = ({ 
    children, 
    className = '',
    glassEffect = true,
    hoverLift = true,
    gradientBorder = false
}) => {
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        if (!hoverLift) return;
        
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const tiltX = ((y - centerY) / centerY) * -10;
        const tiltY = ((x - centerX) / centerX) * 10;
        
        setTilt({ x: tiltX, y: tiltY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    return (
        <div
            className={`
                ${styles.card} 
                ${glassEffect ? styles.glass : ''} 
                ${gradientBorder ? styles.gradientBorder : ''}
                ${className}
            `}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
            }}
        >
            {children}
        </div>
    );
};

export default AnimatedCard;

