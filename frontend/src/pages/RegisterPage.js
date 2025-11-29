import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import styles from './AuthForms.module.css';

function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { register, loginWithGoogle, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            console.log('[RegisterPage] User already authenticated, redirecting to dashboard...');
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        console.log('[RegisterPage] Attempting registration...');
        try {
            await register(email, password);
            console.log('[RegisterPage] Registration successful, navigating...');
            navigate('/dashboard');
        } catch (err) {
            console.error('[RegisterPage] Registration failed:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignup = async () => {
        setError(null);
        setIsGoogleLoading(true);
        console.log('[RegisterPage] Attempting Google signup...');
        try {
            await loginWithGoogle();
            // После успешного вызова произойдет редирект на Google
        } catch (err) {
            console.error('[RegisterPage] Google signup failed:', err);
            setError(err.message || 'Failed to initiate Google signup.');
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <SEO 
                title="Create Account - Start Free"
                description="Create your free MyPhotoAI account. Start generating AI photos and videos of yourself in any style. No credit card required."
                path="/register"
            />
            <div className={styles.authHeader}>
                <h1 className={styles.authTitle}>Create Account</h1>
                <p className={styles.authSubtitle}>Start your journey by creating an account</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="register-email" className={styles.formLabel}>Email:</label>
                    <input
                        type="email"
                        id="register-email"
                        className={styles.formInput}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        autoComplete="email"
                        placeholder="Enter your email"
                    />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="register-password" className={styles.formLabel}>Password:</label>
                    <input
                        type="password"
                        id="register-password"
                        className={styles.formInput}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        placeholder="Enter password (min. 6 characters)"
                    />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="confirm-password" className={styles.formLabel}>Confirm Password:</label>
                    <input
                        type="password"
                        id="confirm-password"
                        className={styles.formInput}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                    />
                </div>
                
                {error && <div className={styles.errorMessage}>{error}</div>}
                
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={styles.submitButton}
                >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
                
                {/* TODO: Implement social registration */}
                <div className={styles.divider}>
                    <span>or</span>
                </div>
                
                <button 
                    type="button" 
                    className={styles.socialButton} 
                    disabled={isSubmitting || isGoogleLoading}
                    onClick={handleGoogleSignup}
                >
                    {/* Google SVG Icon */}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.8055 8.0415H19V8H10V12H15.6515C14.827 14.3285 12.6115 16 10 16C6.6865 16 4 13.3135 4 10C4 6.6865 6.6865 4 10 4C11.5295 4 12.921 4.577 13.9805 5.5195L16.809 2.691C15.023 1.0265 12.634 0 10 0C4.4775 0 0 4.4775 0 10C0 15.5225 4.4775 20 10 20C15.5225 20 20 15.5225 20 10C20 9.3295 19.931 8.675 19.8055 8.0415Z" fill="#FFC107"/>
                        <path d="M1.15295 5.3455L4.43845 7.755C5.32795 5.554 7.48045 4 9.99995 4C11.5294 4 12.921 4.577 13.9805 5.5195L16.809 2.691C15.023 1.0265 12.634 0 9.99995 0C6.15895 0 2.82795 2.1685 1.15295 5.3455Z" fill="#FF3D00"/>
                        <path d="M9.99999 20C12.583 20 14.93 19.0115 16.7045 17.404L13.6095 14.785C12.5718 15.5742 11.3037 16.001 9.99999 16C7.39949 16 5.19049 14.3415 4.35649 12.027L1.09799 14.5395C2.75249 17.778 6.11349 20 9.99999 20Z" fill="#4CAF50"/>
                        <path d="M19.8055 8.0415H19V8H10V12H15.6515C15.2571 13.1082 14.5467 14.0766 13.608 14.7855L13.6095 14.7845L16.7045 17.4035C16.4855 17.6025 20 15 20 10C20 9.3295 19.931 8.675 19.8055 8.0415Z" fill="#1976D2"/>
                    </svg>
                    {isGoogleLoading ? 'Redirecting to Google...' : 'Sign Up with Google'}
                </button>
            </form>
            
            <div className={styles.alternateLink}>
                Already have an account? <Link to="/login">Sign In</Link>
            </div>
        </div>
    );
}

export default RegisterPage; 