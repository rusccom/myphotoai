import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
