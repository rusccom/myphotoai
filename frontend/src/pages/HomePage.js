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
import Faq from '../components/home/Faq';
import FinalCTA from '../components/home/FinalCTA';

// Combined schema for homepage
const homePageSchema = {
    "@context": "https://schema.org",
    "@graph": [
        SCHEMAS.organization,
        SCHEMAS.softwareApplication
    ]
};

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
                path="/"
                description="Turn your photos into a personalized AI model. Generate stunning, photorealistic images and videos of yourself in any style or setting. Start creating your digital twin today!"
                schema={homePageSchema}
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
