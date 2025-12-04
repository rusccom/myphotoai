import React, { useState, useEffect } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './Capabilities.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function Capabilities() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [presets, setPresets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load presets from API
    useEffect(() => {
        const loadData = async () => {
            try {
                const [catRes, presetsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/preset/categories`),
                    fetch(`${API_BASE}/api/preset/list`)
                ]);
                
                if (catRes.ok && presetsRes.ok) {
                    const catData = await catRes.json();
                    const presetsData = await presetsRes.json();
                    setCategories(catData.categories || []);
                    setPresets(presetsData.presets || []);
                }
            } catch (error) {
                console.error('Failed to load presets:', error);
            }
                setIsLoading(false);
        };
        
        loadData();
    }, []);

    // Generate placeholder color based on category
    const getPlaceholder = (categoryName) => {
        const colors = {
            'Portraits': '8b5cf6',
            'Fashion': 'ec4899',
            'Professional': '6366f1',
            'Creative': 'a78bfa'
        };
        const color = colors[categoryName] || '8b5cf6';
        return `https://placehold.co/600x800/${color}/ffffff?text=${categoryName || 'Preset'}`;
    };

    // Filter presets by category
    const displayPresets = activeCategory === 'all'
        ? presets
        : presets.filter(p => p.category_id === activeCategory);

    // Handle image error (fallback to placeholder)
    const handleImageError = (e, categoryName) => {
        e.target.src = getPlaceholder(categoryName);
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

                {/* Category tabs */}
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

                {/* Grid with presets */}
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
                                            alt={preset.name}
                                            className={styles.image}
                                            onError={(e) => handleImageError(e, preset.category_name)}
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
