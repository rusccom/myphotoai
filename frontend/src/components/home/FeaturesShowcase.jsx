import React from 'react';
import ScrollReveal from './animations/ScrollReveal';
import FeatureCard from './FeatureCard';
import GradientText from './animations/GradientText';
import styles from './FeaturesShowcase.module.css';

const features = [
    {
        icon: '📸',
        title: 'Create Personal Photos',
        description: 'Create your virtual twin with your photos and generate new images in any location and style you desire.',
        comingSoon: false,
        scrollToId: 'model-generation'
    },
    {
        icon: '✨',
        title: 'Edit Your Photos',
        description: 'Upload or create photos, add or remove elements exactly as you want them.',
        comingSoon: false,
        scrollToId: 'photo-editing'
    },
    {
        icon: '👕',
        title: 'Virtual Try-On',
        description: 'Generate yourself in any location or upload your photo. Upload a clothing image you want to try on and get ready-to-use photos.',
        comingSoon: false,
        scrollToId: 'clothing-try-on'
    },
    {
        icon: '🎬',
        title: 'Bring Photos to Life',
        description: 'Create personalized videos from your photos or generated images, or simply create videos from text descriptions.',
        comingSoon: false,
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
                            Powerful AI tools for creating professional content
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

