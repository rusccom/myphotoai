import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';

function PaymentSuccessPage() {
    const { checkStatus } = useAuth();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    // После успешной оплаты, обновляем статус пользователя,
    // чтобы получить актуальный баланс
    useEffect(() => {
        if (sessionId) {
            console.log('Payment successful, session ID:', sessionId);
            // Вызываем checkStatus, чтобы обновить данные пользователя (включая баланс)
            checkStatus();
        }
    }, [sessionId, checkStatus]);

    return (
        <>
            <SEO
                title="Payment Successful"
                description="Your MyPhotoAI payment was completed successfully."
                path="/payment/success"
                noindex={true}
            />
            <div>
                <h2>Payment Successful!</h2>
                <p>Your points balance will be updated shortly.</p>
                {sessionId && <p><small>Session ID: {sessionId}</small></p>}
                <Link to="/billing">Go to Billing</Link>
            </div>
        </>
    );
}

export default PaymentSuccessPage; 
