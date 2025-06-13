import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PaymentSuccessPage() {
    const { checkStatus } = useAuth();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    // После успешной оплаты, обновляем статус пользователя в нашем приложении,
    // чтобы получить актуальный тип подписки
    useEffect(() => {
        if (sessionId) {
            console.log('Payment successful, session ID:', sessionId);
            // Вызываем checkStatus, чтобы обновить данные пользователя (включая подписку)
            checkStatus();
        }
    }, [sessionId, checkStatus]);

    return (
        <div>
            <h2>Payment Successful!</h2>
            <p>Your subscription has been activated.</p>
            {sessionId && <p><small>Session ID: {sessionId}</small></p>}
            <Link to="/dashboard">Go to Dashboard</Link>
        </div>
    );
}

export default PaymentSuccessPage; 