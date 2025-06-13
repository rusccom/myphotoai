import React from 'react';
import { Link } from 'react-router-dom';

function PaymentCancelPage() {
    return (
        <div>
            <h2>Payment Cancelled</h2>
            <p>Your payment process was cancelled. You can try again from the pricing page.</p>
            <Link to="/pricing">Back to Pricing</Link>
        </div>
    );
}

export default PaymentCancelPage; 