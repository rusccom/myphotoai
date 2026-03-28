import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/api';
import styles from './AccountPage.module.css';

function AccountPage() {
    const { user, isLoading } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordChangeError, setPasswordChangeError] = useState(null);
    const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(null);
    const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

    const pageSeo = (
        <SEO noindex={true} />
    );

    const handlePasswordChangeSubmit = async (event) => {
        event.preventDefault();
        setPasswordChangeError(null);
        setPasswordChangeSuccess(null);

        if (newPassword !== confirmNewPassword) {
            setPasswordChangeError('New passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
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
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            setPasswordChangeError(error.message || 'Failed to change password. Please check current password.');
        } finally {
            setIsPasswordSubmitting(false);
        }
    };

    if (isLoading || !user) {
        return (
            <>
                {pageSeo}
                <div className={styles.loading}>Loading account details...</div>
            </>
        );
    }

    return (
        <>
            {pageSeo}
            <div className={styles.accountContainer}>
                <h1 className={styles.pageTitle}>My Account</h1>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Account Information</h2>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Email:</span>
                        <span className={styles.infoValue}>{user.email}</span>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Billing & Points</h2>
                    <div className={styles.buttonGroup}>
                        <Link to="/billing" className={styles.actionButton}>
                            Buy Points
                        </Link>
                    </div>
                </section>

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
            </div>
        </>
    );
}

export default AccountPage;
