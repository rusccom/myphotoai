import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import styles from './BillingPage.module.css';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession, quotePoints } from '../services/api';

// Функция для форматирования даты
const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleString();
    } catch (e) {
        return 'Invalid Date';
    }
};

const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_PUBLISHABLE_KEY.startsWith('pk_')
    ? loadStripe(STRIPE_PUBLISHABLE_KEY)
    : null;

function BillingPage() {
    const [amount, setAmount] = useState(10);
    const [customAmount, setCustomAmount] = useState('');
    const [isCustomSelected, setIsCustomSelected] = useState(false);
    const { api } = useAuth();
    // Состояния для истории платежей
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState(null);
    // Состояние для обработки процесса оплаты
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
    const [quoteInfo, setQuoteInfo] = useState(null);
    const [quoteError, setQuoteError] = useState('');
    const [isQuoting, setIsQuoting] = useState(false);

    const predefinedAmounts = [10, 30, 50];
    const MIN_CUSTOM_AMOUNT = 10;
    const [minPurchaseUsd, setMinPurchaseUsd] = useState(MIN_CUSTOM_AMOUNT);

    // --- Выносим fetchHistory из useEffect и оборачиваем в useCallback --- 
    const fetchHistory = useCallback(async () => {
        if (!api) return; // Проверка, что api доступно
        setIsLoadingHistory(true);
        setHistoryError(null);
        try {
            // Используем api(...) напрямую, без .get
            const response = await api('/auth/payment-history'); 
            setHistory(response.history); // Данные лежат в response.history
        } catch (err) { 
            console.error("Failed to fetch payment history:", err);
            const errorMsg = err.error || err.message || "Could not load payment history.";
            setHistoryError(errorMsg);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [api]); // Зависимость от api

    // Загрузка истории при монтировании компонента
    useEffect(() => {
        fetchHistory(); // Вызываем функцию, определенную выше
    }, [fetchHistory]); // Зависимость от fetchHistory (которая зависит от api)

    const handlePredefinedAmountSelect = (value) => {
        setAmount(value);
        setCustomAmount('');
        setIsCustomSelected(false);
        setPaymentErrorMessage('');
        setQuoteError('');
    };

    const handleCustomAmountChange = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) { 
            setCustomAmount(value);
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue) && numericValue >= minPurchaseUsd) {
                setAmount(numericValue);
            } else {
                // Reset amount if invalid? Or just disable button?
                // For now, just disable button via isValidAmount check
            }
            setPaymentErrorMessage('');
            setQuoteError('');
        }
    };
    
    const handleCustomInputFocus = () => {
        setIsCustomSelected(true);
        setPaymentErrorMessage('');
        setQuoteError('');
        if (customAmount === '') {
             // Automatically set minimum if empty when focusing
             setCustomAmount(String(minPurchaseUsd));
             setAmount(minPurchaseUsd);
        }
    };

    const isValidAmount = !isCustomSelected ? amount >= minPurchaseUsd :
                          !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) >= minPurchaseUsd;
    const pointsToReceive = quoteInfo?.points;

    useEffect(() => {
        let isActive = true;
        if (!isValidAmount) {
            setIsQuoting(false);
            setQuoteInfo(null);
            return;
        }
        setIsQuoting(true);
        setQuoteError('');
        const timer = setTimeout(async () => {
            try {
                const quote = await quotePoints(amount);
                if (isActive) {
                    setQuoteInfo(quote);
                    if (quote.min_purchase_usd) {
                        setMinPurchaseUsd(quote.min_purchase_usd);
                    }
                }
            } catch (err) {
                if (isActive) {
                    const errorMsg = err.error || err.message || "Could not calculate points.";
                    setQuoteError(errorMsg);
                    setQuoteInfo(null);
                }
            } finally {
                if (isActive) {
                    setIsQuoting(false);
                }
            }
        }, 250);
        return () => {
            isActive = false;
            clearTimeout(timer);
        };
    }, [amount, isValidAmount]);

    const handlePayment = async () => {
        if (!isValidAmount || isProcessingPayment) return;
        if (!stripePromise) {
            setPaymentErrorMessage('Stripe is not configured correctly.');
            return;
        }

        setIsProcessingPayment(true);
        setPaymentErrorMessage('');

        try {
            const { sessionId } = await createCheckoutSession(amount);
            const stripe = await stripePromise;
            const { error } = await stripe.redirectToCheckout({ sessionId });
            if (error) {
                console.error("Stripe checkout error:", error);
                setPaymentErrorMessage(error.message || 'Failed to redirect to payment.');
            }
        } catch (error) {
            console.error("Payment failed:", error);
            const errorMsg = error.error || error.message || 'Failed to start payment. Please try again.';
            setPaymentErrorMessage(errorMsg);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    return (
        <>
            <SEO noindex={true} />
            <div className={styles.billingContainer}>
            <h1>Billing & Payments</h1>
            <p>Purchase points to use premium features. Base rate: 1 Point = $0.01, discounts apply for larger top-ups.</p>
            
            <div className={styles.purchaseSection}>
                <h2>Purchase Points</h2>
                <div className={styles.amountSelector}>
                    {predefinedAmounts.map((predefined) => (
                        <button 
                            key={predefined}
                            className={`${styles.amountButton} ${!isCustomSelected && amount === predefined ? styles.selected : ''}`}
                            onClick={() => handlePredefinedAmountSelect(predefined)}
                        >
                            ${predefined}
                        </button>
                    ))}
                    <input 
                        type="text" 
                        placeholder={`Min $${minPurchaseUsd}`}
                        className={`${styles.customAmountInput} ${isCustomSelected ? styles.selectedInput : ''}`}
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        onFocus={handleCustomInputFocus}
                        readOnly={isProcessingPayment} // Блокируем во время обработки
                    />
                </div>
                {isCustomSelected && customAmount !== '' && parseFloat(customAmount) < minPurchaseUsd && (
                    <p className={styles.warningText}>Minimum amount is ${minPurchaseUsd}</p>
                )}
                
                <div className={styles.summary}>
                    <span>You will receive:</span>
                    <span className={styles.pointsValue}>
                        {!isValidAmount
                            ? '-'
                            : isQuoting
                                ? 'Calculating...'
                                : pointsToReceive
                                    ? `${pointsToReceive} points`
                                    : '-'}
                    </span>
                </div>

                {quoteInfo?.discount_percent > 0 && (
                    <p className={styles.successText}>
                        Discount applied: {quoteInfo.discount_percent}%
                    </p>
                )}
                {quoteError && <p className={styles.errorText}>{quoteError}</p>}
                {paymentErrorMessage && <p className={styles.errorText}>{paymentErrorMessage}</p>}

                <button 
                    className={styles.payButton}
                    onClick={handlePayment}
                    disabled={!isValidAmount || isProcessingPayment} // Деактивируем кнопку, если сумма невалидна или идет обработка
                >
                    {isProcessingPayment ? 'Processing...' : `Pay $${isValidAmount ? amount.toFixed(2) : '--.--'}`}
                </button>
            </div>

            <div className={styles.historySection}>
                <h2>Payment History</h2>
                {isLoadingHistory ? (
                    <p>Loading payment history...</p>
                ) : historyError ? (
                    <p className={styles.errorText}>{historyError}</p>
                ) : history.length === 0 ? (
                    <p>No payment transactions found.</p>
                ) : (
                    // Обертка для таблицы для горизонтального скролла
                    <div className={styles.tableContainer}> 
                        <table className={styles.historyTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount (USD)</th>
                                    <th>Points Received</th>
                                    <th>Status</th>
                                    <th>Transaction ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>{formatDate(payment.payment_time)}</td>
                                        <td>${payment.amount_usd}</td>
                                        <td>{payment.amount_points}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[`status_${payment.status?.toLowerCase()}`]}`}>
                                                {payment.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td>{payment.transaction_id || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div> // Закрываем обертку
                )}
            </div>
            </div>
        </>
    );
}

export default BillingPage; 
