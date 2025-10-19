import React from 'react';
import { useParallax } from '../../../hooks/useParallax';

const ParallaxSection = ({ children, speed = 0.5, className = '' }) => {
    const offset = useParallax(speed);

    return (
        <div
            className={className}
            style={{
                transform: `translateY(${offset}px)`,
                transition: 'transform 0.1s ease-out'
            }}
        >
            {children}
        </div>
    );
};

export default ParallaxSection;

