import React, { useState, useEffect } from 'react';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './Capabilities.module.css';

// R2 base URL for landing media (required in production)
const R2_BASE = process.env.REACT_APP_R2_URL;

function Capabilities() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [presets, setPresets] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [isLoading, setIsLoading] = useState(true);

    // Load presets configuration from R2
    useEffect(() => {
        const configUrl = `${R2_BASE}/landing/presets/presets-config.json`;
        
        fetch(configUrl)
            .then(res => res.json())
            .then(data => {
                setCategories(data.categories || ['All']);
                setPresets(data.presets || []);
                setIsLoading(false);
            })
            .catch(() => {
                // Fallback: show placeholders for each category
                const fallbackCategories = ['All', 'Portraits', 'Fashion', 'Professional', 'Creative'];
                const fallbackPresets = [
                    { category: 'Portraits', title: 'Portrait Presets', images: [] },
                    { category: 'Fashion', title: 'Fashion Presets', images: [] },
                    { category: 'Professional', title: 'Professional Presets', images: [] },
                    { category: 'Creative', title: 'Creative Presets', images: [] }
                ];
                setCategories(fallbackCategories);
                setPresets(fallbackPresets);
                setIsLoading(false);
            });
    }, []);

    // Generate image path in R2
    const getImagePath = (category, filename) => {
        return `${R2_BASE}/landing/presets/${category}/${filename}`;
    };

    // Generate placeholder
    const getPlaceholder = (category, index) => {
        const colors = {
            'Portraits': '8b5cf6',
            'Fashion': 'ec4899',
            'Professional': '6366f1',
            'Creative': 'a78bfa'
        };
        const color = colors[category] || '8b5cf6';
        return `https://placehold.co/600x800/${color}/ffffff?text=${category}+${index + 1}`;
    };

    // Get images for display
    const getDisplayImages = () => {
        if (activeCategory === 'All') {
            // Show all images from all categories
            const allImages = [];
            presets.forEach(preset => {
                const images = preset.images.length > 0 
                    ? preset.images 
                    : ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'];
                
                images.forEach((filename, index) => {
                    allImages.push({
                        id: `${preset.category}-${index}`,
                        category: preset.category,
                        title: `${preset.category} ${index + 1}`,
                        imagePath: getImagePath(preset.category, filename),
                        placeholder: getPlaceholder(preset.category, index)
                    });
                });
            });
            return allImages;
        } else {
            // Show images for selected category
            const preset = presets.find(p => p.category === activeCategory);
            if (!preset) return [];
            
            const images = preset.images.length > 0 
                ? preset.images 
                : ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'];
            
            return images.map((filename, index) => ({
                id: `${preset.category}-${index}`,
                category: preset.category,
                title: `${preset.category} ${index + 1}`,
                imagePath: getImagePath(preset.category, filename),
                placeholder: getPlaceholder(preset.category, index)
            }));
        }
    };

    // Handle image error (fallback to placeholder)
    const handleImageError = (e, placeholder) => {
        e.target.src = placeholder;
    };

    const displayImages = getDisplayImages();

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
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            className={`${styles.categoryTab} ${activeCategory === cat ? styles.active : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid with presets */}
                {isLoading ? (
                    <div className={styles.loading}>Loading presets...</div>
                ) : (
                    <div className={styles.bentoGrid}>
                        {displayImages.map((item, index) => (
                            <ScrollReveal key={item.id} animation="scale" delay={index * 50}>
                                <div className={styles.gridItem}>
                                    <div className={styles.imageWrapper}>
                                        <img 
                                            src={item.imagePath} 
                                            alt={item.title}
                                            className={styles.image}
                                            onError={(e) => handleImageError(e, item.placeholder)}
                                        />
                                        <div className={styles.overlay}>
                                            <div className={styles.overlayContent}>
                                                <span className={styles.categoryBadge}>{item.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                )}

                {displayImages.length === 0 && !isLoading && (
                    <div className={styles.emptyState}>
                        <p>No presets available for this category</p>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Capabilities;
