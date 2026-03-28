import React from 'react';
import ScrollReveal from './animations/ScrollReveal';
import FeatureCard from './FeatureCard';
import GradientText from './animations/GradientText';
import styles from './FeaturesShowcase.module.css';

const features = [
    {
        icon: '\uD83D\uDCF8',
        title: 'Generate Portraits & Headshots',
        description: 'Train on your photos and create realistic portraits in different looks, locations, and styles.',
        comingSoon: false,
        scrollToId: 'model-generation'
    },
    {
        icon: '\u2728',
        title: 'Edit Photos with Prompts',
        description: 'Upload an image and add, remove, or transform elements with AI-guided edits.',
        comingSoon: false,
        scrollToId: 'photo-editing'
    },
    {
        icon: '\uD83D\uDC55',
        title: 'Virtual Outfit Try-On',
        description: 'Upload a clothing item and see how it looks on you in ready-to-use results.',
        comingSoon: false,
        scrollToId: 'clothing-try-on'
    },
    {
        icon: '\uD83C\uDFAC',
        title: 'Animate Photos',
        description: 'Turn still images into short AI motion clips. Full dashboard tool is coming soon.',
        comingSoon: true,
        scrollToId: 'live-photo'
    }
];

function FeaturesShowcase() {
    return (
        <section id="features" className={styles.section}>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            What you can <GradientText animated={true}>create</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            One trained model for portraits, edits, and outfit try-ons
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.featuresGrid}>
                    {features.map((feature, index) => (
                        <ScrollReveal key={feature.title} animation="fadeUp" delay={index * 100}>
                            <FeatureCard {...feature} delay={index * 100} />
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default FeaturesShowcase;
