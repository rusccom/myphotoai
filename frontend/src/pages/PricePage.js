import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession } from '../services/api';
import styles from './PricePage.module.css';

// Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_PUBLISHABLE_KEY';

// Replace with your actual Price IDs
// These should match the ones used on the backend
const PRICE_IDS = {
    plus_monthly: 'price_YOUR_PLUS_MONTHLY_ID',
    plus_yearly: 'price_YOUR_PLUS_YEARLY_ID',
    premium_monthly: 'price_YOUR_PREMIUM_MONTHLY_ID',
    premium_yearly: 'price_YOUR_PREMIUM_YEARLY_ID'
};

// Initialize Stripe outside the component
let stripePromise;
if (STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
} else {
    console.error("Stripe Publishable Key is missing or invalid. Please set REACT_APP_STRIPE_PUBLISHABLE_KEY in your .env file.")
}

function PricePage() {
    const { user, isAuthenticated } = useAuth();
    const [error, setError] = useState(null);
    const [loadingPriceId, setLoadingPriceId] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

    const handleSubscribe = async (planType) => {
        setError(null);
        if (!isAuthenticated) {
            setError("Please log in or register to subscribe.");
            return;
        }
        if (!stripePromise) {
            setError("Stripe is not configured correctly.");
            return;
        }

        const priceId = PRICE_IDS[`${planType}_${billingCycle}`];
        setLoadingPriceId(priceId);

        try {
            // 1. Request sessionId from our backend
            const { sessionId } = await createCheckoutSession(priceId);

            // 2. Redirect to Stripe Checkout
            const stripe = await stripePromise;
            const { error } = await stripe.redirectToCheckout({ sessionId });

            if (error) {
                console.error("Stripe checkout error:", error);
                setError(error.message || 'Failed to redirect to payment.');
            }
        } catch (err) {
            console.error("Subscription error:", err);
            setError(err.message || 'Failed to initiate subscription.');
        } finally {
            setLoadingPriceId(null);
        }
    };

    // Calculate prices with discount for yearly plans
    const prices = {
        plus: {
            monthly: 10,
            yearly: 96 // 20% yearly discount
        },
        premium: {
            monthly: 25,
            yearly: 240 // 20% yearly discount
        }
    };

    const toggleBillingCycle = () => {
        setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly');
    };

    return (
        <div className={styles.pricingContainer}>
            <div className={styles.pricingHeader}>
                <h1 className={styles.pricingTitle}>Choose the Right Plan</h1>
                <p className={styles.pricingSubtitle}>
                    All plans include access to core features. Select the plan that 
                    fits your needs.
                </p>
                
                <div className={styles.pricingToggle}>
                    <span className={`${styles.toggleOption} ${billingCycle === 'monthly' ? styles.toggleActive : ''}`}>
                        Monthly Billing
                    </span>
                    <div className={styles.toggle} onClick={toggleBillingCycle}>
                        <div className={`${styles.toggleThumb} ${billingCycle === 'yearly' ? styles.toggleRight : styles.toggleLeft}`}></div>
                    </div>
                    <span className={`${styles.toggleOption} ${billingCycle === 'yearly' ? styles.toggleActive : ''}`}>
                        Yearly Billing <strong>-20%</strong>
                    </span>
                </div>
            </div>
            
            {error && <div className={styles.pricingError}>Error: {error}</div>}

            <div className={styles.pricingPlans}>
                {/* Free Plan */}
                <div className={styles.pricingCard}>
                    <h3 className={styles.planName}>Free</h3>
                    <div className={styles.planPrice}>
                        <span className={styles.planCurrency}>$</span>0
                        <span className={styles.planPeriod}>/mo</span>
                    </div>
                    <p className={styles.planDescription}>
                        Ideal for exploring the platform's capabilities.
                    </p>
                    
                    <div className={styles.divider}></div>
                    
                    <ul className={styles.featureList}>
                        <li className={styles.featureItem}>1 AI Model</li>
                        <li className={styles.featureItem}>10 Generations per day</li>
                        <li className={styles.featureItem}>Basic Quality</li>
                        <li className={styles.featureItem}>Basic Support</li>
                    </ul>
                    
                    {isAuthenticated && user?.subscription_type === 'free' ? (
                        <div className={styles.currentPlan}>Your Current Plan</div>
                    ) : (
                        !isAuthenticated && (
                            <Link to="/register">
                                <button className={styles.subscribeButton}>Start for Free</button>
                            </Link>
                        )
                    )}
                </div>

                {/* Plus Plan */}
                <div className={`${styles.pricingCard} ${styles.popular}`}>
                    <div className={styles.popularBadge}>Popular</div>
                    <h3 className={styles.planName}>Plus</h3>
                    <div className={styles.planPrice}>
                        <span className={styles.planCurrency}>$</span>
                        {prices.plus[billingCycle]}
                        <span className={styles.planPeriod}>
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                    </div>
                    <p className={styles.planDescription}>
                        For enthusiasts and frequent content creators.
                    </p>
                    
                    <div className={styles.divider}></div>
                    
                    <ul className={styles.featureList}>
                        <li className={styles.featureItem}>Up to 3 AI Models</li>
                        <li className={styles.featureItem}>50 Generations per day</li>
                        <li className={styles.featureItem}>Enhanced Quality</li>
                        <li className={styles.featureItem}>Priority Support</li>
                        <li className={styles.featureItem}>Save Generation History</li>
                    </ul>
                    
                    {isAuthenticated && user?.subscription_type === 'plus' ? (
                        <div className={styles.currentPlan}>Your Current Plan</div>
                    ) : (
                        <button
                            onClick={() => handleSubscribe('plus')}
                            disabled={loadingPriceId === PRICE_IDS[`plus_${billingCycle}`] || !stripePromise}
                            className={styles.subscribeButton}
                        >
                            {loadingPriceId === PRICE_IDS[`plus_${billingCycle}`] ? 'Processing...' : 'Subscribe to Plus'}
                        </button>
                    )}
                </div>

                {/* Premium Plan */}
                <div className={styles.pricingCard}>
                    <h3 className={styles.planName}>Premium</h3>
                    <div className={styles.planPrice}>
                        <span className={styles.planCurrency}>$</span>
                        {prices.premium[billingCycle]}
                        <span className={styles.planPeriod}>
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                    </div>
                    <p className={styles.planDescription}>
                        Maximum capabilities for professionals.
                    </p>
                    
                    <div className={styles.divider}></div>
                    
                    <ul className={styles.featureList}>
                        <li className={styles.featureItem}>Unlimited AI Models</li>
                        <li className={styles.featureItem}>200 Generations per day</li>
                        <li className={styles.featureItem}>Highest Quality</li>
                        <li className={styles.featureItem}>24/7 Priority Support</li>
                        <li className={styles.featureItem}>Early Access to New Features</li>
                        <li className={styles.featureItem}>Video Generation (Soon)</li>
                    </ul>
                    
                    {isAuthenticated && user?.subscription_type === 'premium' ? (
                        <div className={styles.currentPlan}>Your Current Plan</div>
                    ) : (
                        <button
                            onClick={() => handleSubscribe('premium')}
                            disabled={loadingPriceId === PRICE_IDS[`premium_${billingCycle}`] || !stripePromise}
                            className={styles.subscribeButton}
                        >
                            {loadingPriceId === PRICE_IDS[`premium_${billingCycle}`] ? 'Processing...' : 'Subscribe to Premium'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PricePage; 