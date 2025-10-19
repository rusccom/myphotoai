import { useIntersectionObserver } from './useIntersectionObserver';

export const useScrollAnimation = (animationType = 'fadeUp', delay = 0) => {
    const [ref, isVisible] = useIntersectionObserver({
        threshold: 0.1,
        triggerOnce: true
    });

    const animationClass = isVisible ? 'animate-in' : 'animate-out';
    const style = {
        animationDelay: `${delay}ms`
    };

    return { ref, isVisible, animationClass, style };
};

