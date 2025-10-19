import { useEffect, useRef, useState } from 'react';

export const useIntersectionObserver = (options = {}) => {
    const elementRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const defaultOptions = {
            threshold: 0.1,
            triggerOnce: true,
            ...options
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (defaultOptions.triggerOnce && !hasAnimated) {
                        setHasAnimated(true);
                    }
                } else if (!defaultOptions.triggerOnce) {
                    setIsVisible(false);
                }
            });
        }, {
            threshold: defaultOptions.threshold,
            rootMargin: defaultOptions.rootMargin || '0px'
        });

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [hasAnimated, options]);

    return [elementRef, isVisible];
};

