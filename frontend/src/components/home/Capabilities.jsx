import React, { useEffect, useState } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './Capabilities.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';
const FALLBACK_CATEGORIES = [
    { id: 'portraits', name: 'Portraits' },
    { id: 'fashion', name: 'Fashion' },
    { id: 'professional', name: 'Professional' },
    { id: 'creative', name: 'Creative' }
];
const FALLBACK_PRESETS = [
    { id: 'portrait-studio', category_id: 'portraits', category_name: 'Portraits', name: 'Studio Portrait' },
    { id: 'editorial-fashion', category_id: 'fashion', category_name: 'Fashion', name: 'Editorial Fashion' },
    { id: 'business-headshot', category_id: 'professional', category_name: 'Professional', name: 'Business Headshot' },
    { id: 'cinematic-neon', category_id: 'creative', category_name: 'Creative', name: 'Cinematic Neon' }
];

function Capabilities() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [presets, setPresets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showingFallback, setShowingFallback] = useState(false);

    useEffect(() => {
        const loadFallbackData = () => {
            setCategories(FALLBACK_CATEGORIES);
            setPresets(FALLBACK_PRESETS);
            setShowingFallback(true);
        };

        const loadData = async () => {
            try {
                const [catRes, presetsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/preset/categories`),
                    fetch(`${API_BASE}/api/preset/list`)
                ]);

                if (!catRes.ok || !presetsRes.ok) {
                    loadFallbackData();
                    return;
                }

                const catData = await catRes.json();
                const presetsData = await presetsRes.json();
                setCategories(catData.categories || []);
                setPresets(presetsData.presets || []);
                setShowingFallback(false);
            } catch (error) {
                console.error('Failed to load presets:', error);
                loadFallbackData();
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const getPlaceholder = (categoryName) => {
        const colors = {
            Portraits: '8b5cf6',
            Fashion: 'ec4899',
            Professional: '6366f1',
            Creative: 'a78bfa'
        };
        const color = colors[categoryName] || '8b5cf6';
        return `https://placehold.co/600x800/${color}/ffffff?text=${categoryName || 'Preset'}`;
    };

    const displayPresets = activeCategory === 'all'
        ? presets
        : presets.filter((preset) => preset.category_id === activeCategory);

    const handleImageError = (event, categoryName) => {
        event.target.src = getPlaceholder(categoryName);
    };

    return (
        <section id="capabilities" className={styles.section}>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Presets <GradientText animated={true}>for Inspiration</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            Ready-made styles for creating perfect images
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.categoryTabs}>
                    <button
                        className={`${styles.categoryTab} ${activeCategory === 'all' ? styles.active : ''}`}
                        onClick={() => setActiveCategory('all')}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.active : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {showingFallback && (
                    <div className={styles.emptyState}>
                        <p>Live presets are temporarily unavailable. Showing curated examples instead.</p>
                    </div>
                )}

                {isLoading ? (
                    <div className={styles.loading}>Loading presets...</div>
                ) : (
                    <div className={styles.bentoGrid}>
                        {displayPresets.map((preset, index) => (
                            <ScrollReveal key={preset.id} animation="scale" delay={index * 50}>
                                <div className={styles.gridItem}>
                                    <div className={styles.imageWrapper}>
                                        <img
                                            src={preset.signed_url || getPlaceholder(preset.category_name)}
                                            alt={`${preset.category_name || 'AI'} preset example: ${preset.name}`}
                                            className={styles.image}
                                            onError={(event) => handleImageError(event, preset.category_name)}
                                        />
                                        <div className={styles.overlay}>
                                            <div className={styles.overlayContent}>
                                                <span className={styles.categoryBadge}>{preset.category_name}</span>
                                                <span className={styles.presetName}>{preset.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                )}

                {displayPresets.length === 0 && !isLoading && (
                    <div className={styles.emptyState}>
                        <p>No presets available yet</p>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Capabilities;
