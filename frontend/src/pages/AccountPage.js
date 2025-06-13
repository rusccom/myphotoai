import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { changePassword } from '../services/api';
import styles from './AccountPage.module.css';

function AccountPage() {
    const { user, isLoading } = useAuth();

    // --- Состояния для смены пароля ---
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordChangeError, setPasswordChangeError] = useState(null);
    const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(null);
    const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
    // ------------------------------------

    const handleCancelSubscription = () => {
        // TODO: Implement backend API call to cancel subscription
        alert('Subscription cancellation feature is not yet implemented.');
    };

    // Helper function to format dates
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // --- Обработчик смены пароля ---
    const handlePasswordChangeSubmit = async (event) => {
        event.preventDefault();
        setPasswordChangeError(null);
        setPasswordChangeSuccess(null);

        if (newPassword !== confirmNewPassword) {
            setPasswordChangeError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 6) { // Пример валидации длины
            setPasswordChangeError('New password must be at least 6 characters long.');
            return;
        }
        if (!currentPassword) {
             setPasswordChangeError('Current password is required.');
             return;
        }

        setIsPasswordSubmitting(true);
        try {
            const response = await changePassword(currentPassword, newPassword);
            setPasswordChangeSuccess(response.message || 'Password changed successfully!');
            // Очистка полей после успеха
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            setPasswordChangeError(error.message || 'Failed to change password. Please check current password.');
        } finally {
            setIsPasswordSubmitting(false);
        }
    };
    // --------------------------------

    if (isLoading || !user) {
        // Показываем заглушку во время загрузки или если пользователя нет (хотя сюда не должны попасть без user)
        return <div className={styles.loading}>Loading account details...</div>;
    }

    const isPaidSubscription = user.subscription_type !== 'free';
    const subscriptionEndDate = user.subscription_end_date;

    return (
        <div className={styles.accountContainer}>
            <h1 className={styles.pageTitle}>My Account</h1>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Account Information</h2>
                <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{user.email}</span>
                </div>
                {/* Можно добавить другую информацию о пользователе, если она есть */}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Subscription Details</h2>
                <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Current Plan:</span>
                    <span className={`${styles.infoValue} ${styles.planType}`}>{user.subscription_type?.toUpperCase() || 'N/A'}</span>
                </div>
                {isPaidSubscription && (
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Subscription Ends:</span>
                        <span className={styles.infoValue}>{formatDate(subscriptionEndDate)}</span>
                    </div>
                )}
                 {!isPaidSubscription && (
                    <div className={styles.infoRow}>
                         <span className={styles.infoLabel}>Status:</span>
                         <span className={styles.infoValue}>Active (Free)</span>
                    </div>
                 )}
            </section>

            <section className={styles.section}>
                 <h2 className={styles.sectionTitle}>Manage Subscription</h2>
                 <div className={styles.buttonGroup}>
                    <Link to="/pricing" className={styles.actionButton}>
                         {isPaidSubscription ? 'Change Plan' : 'Upgrade Plan'}
                    </Link>
                    {isPaidSubscription && (
                        <button 
                            onClick={handleCancelSubscription} 
                            className={`${styles.actionButton} ${styles.cancelButton}`}
                        >
                            Cancel Subscription
                        </button>
                    )}
                 </div>
            </section>

            {/* --- Секция смены пароля --- */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Change Password</h2>
                <form onSubmit={handlePasswordChangeSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="current-password" className={styles.formLabel}>Current Password:</label>
                        <input
                            type="password"
                            id="current-password"
                            className={styles.formInput}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            disabled={isPasswordSubmitting}
                            autoComplete="current-password"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="new-password" className={styles.formLabel}>New Password:</label>
                        <input
                            type="password"
                            id="new-password"
                            className={styles.formInput}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength="6"
                            disabled={isPasswordSubmitting}
                            autoComplete="new-password"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="confirm-new-password" className={styles.formLabel}>Confirm New Password:</label>
                        <input
                            type="password"
                            id="confirm-new-password"
                            className={styles.formInput}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                            disabled={isPasswordSubmitting}
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Сообщения об успехе/ошибке */} 
                    {passwordChangeError && <div className={`${styles.message} ${styles.errorMessage}`}>{passwordChangeError}</div>}
                    {passwordChangeSuccess && <div className={`${styles.message} ${styles.successMessage}`}>{passwordChangeSuccess}</div>}

                    <button 
                        type="submit" 
                        disabled={isPasswordSubmitting}
                        className={`${styles.actionButton} ${styles.changePasswordButton}`}
                    >
                        {isPasswordSubmitting ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </section>
            {/* --- Конец секции смены пароля --- */}
        </div>
    );
}

export default AccountPage; 