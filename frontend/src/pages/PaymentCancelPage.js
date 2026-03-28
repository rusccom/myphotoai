import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

function PaymentCancelPage() {
    return (
        <>
            <SEO noindex={true} />
            <div>
                <h2>Payment Cancelled</h2>
                <p>Your payment process was cancelled. You can try again from the billing page.</p>
                <Link to="/billing">Back to Billing</Link>
            </div>
        </>
    );
}

export default PaymentCancelPage; 
