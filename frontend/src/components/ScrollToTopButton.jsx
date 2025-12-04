import React, { useState, useEffect, useCallback } from 'react';
import styles from './ScrollToTopButton.module.css';

function ScrollToTopButton() {
    const [isVisible, setIsVisible] = useState(false);

    const getScrollContainer = useCallback(() => {
        // На mobile (≤ 992px) используем window
        if (window.innerWidth <= 992) {
            return null;
        }
        // На desktop ищем resultsSection
        return document.querySelector('[class*="resultsSection"]');
    }, []);

    const checkVisibility = useCallback(() => {
        const container = getScrollContainer();
        const scrollTop = container 
            ? container.scrollTop 
            : window.pageYOffset;
        
        setIsVisible(scrollTop > 300);
    }, [getScrollContainer]);

    useEffect(() => {
        let currentContainer = getScrollContainer();

        const addListeners = () => {
            currentContainer = getScrollContainer();
            if (currentContainer) {
                currentContainer.addEventListener('scroll', checkVisibility);
            }
            window.addEventListener('scroll', checkVisibility);
        };

        const removeListeners = () => {
            if (currentContainer) {
                currentContainer.removeEventListener('scroll', checkVisibility);
            }
            window.removeEventListener('scroll', checkVisibility);
        };

        addListeners();
        checkVisibility();

        const handleResize = () => {
            removeListeners();
            addListeners();
            checkVisibility();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            removeListeners();
            window.removeEventListener('resize', handleResize);
        };
    }, [getScrollContainer, checkVisibility]);

    const scrollToTop = () => {
        // На mobile (≤ 992px) используем window
        if (window.innerWidth <= 992) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // На desktop скроллим контейнер
        const container = getScrollContainer();
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <button
            className={`${styles.scrollButton} ${isVisible ? styles.visible : ''}`}
            onClick={scrollToTop}
            aria-label="Scroll to top"
        >
            <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M18 15l-6-6-6 6"/>
            </svg>
        </button>
    );
}

export default ScrollToTopButton;
