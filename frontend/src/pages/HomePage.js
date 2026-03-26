import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO, { SCHEMAS } from '../components/SEO';
import styles from './HomePage.module.css';

// New components
import Hero from '../components/home/Hero';
import FeaturesShowcase from '../components/home/FeaturesShowcase';
import ModelGeneration from '../components/home/ModelGeneration';
import PhotoEditing from '../components/home/PhotoEditing';
import ClothingTryOn from '../components/home/ClothingTryOn';
import LivePhoto from '../components/home/LivePhoto';
import Capabilities from '../components/home/Capabilities';
import Faq, { homeFaqs } from '../components/home/Faq';
import FinalCTA from '../components/home/FinalCTA';

const homePageSchemas = [
    SCHEMAS.organization,
    SCHEMAS.softwareApplication,
    {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'MyPhotoAI',
        url: 'https://myphotoai.net'
    },
    SCHEMAS.createFaqSchema(homeFaqs)
];

function HomePage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (isAuthenticated) {
        return null;
    }

    return (
        <div className={styles.page}>
            <SEO 
                title="AI Digital Twin Generator from Your Photos"
                path="/"
                description="Train a personal AI model from your photos and generate photorealistic portraits, edits, outfits, and live-photo videos in any style."
                schema={homePageSchemas}
            />
            <Hero />
            <FeaturesShowcase />
            <ModelGeneration />
            <PhotoEditing />
            <ClothingTryOn />
            <LivePhoto />
            <Capabilities />
            <Faq />
            <FinalCTA />
        </div>
    );
}

export default HomePage;
