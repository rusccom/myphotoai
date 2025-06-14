import React, { useState, useEffect, useCallback } from 'react';
import styles from './BillingPage.module.css';
import { useAuth } from '../context/AuthContext';

// Функция для форматирования даты
const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleString();
    } catch (e) {
        return 'Invalid Date';
    }
};

function BillingPage() {
    const [amount, setAmount] = useState(10);
    const [customAmount, setCustomAmount] = useState('');
    const [isCustomSelected, setIsCustomSelected] = useState(false);
    const { api, updateUser } = useAuth();
    // Состояния для истории платежей
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState(null);
    // Состояние для обработки процесса оплаты
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentSuccessMessage, setPaymentSuccessMessage] = useState('');
    const [paymentErrorMessage, setPaymentErrorMessage] = useState('');

    const predefinedAmounts = [10, 30, 50];
    const MIN_CUSTOM_AMOUNT = 10;

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
        setPaymentSuccessMessage(''); // Сбрасываем сообщения при смене суммы
        setPaymentErrorMessage('');
    };

    const handleCustomAmountChange = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) { 
            setCustomAmount(value);
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue) && numericValue >= MIN_CUSTOM_AMOUNT) {
                setAmount(numericValue);
            } else {
                // Reset amount if invalid? Or just disable button?
                // For now, just disable button via isValidAmount check
            }
            setPaymentSuccessMessage(''); // Сбрасываем сообщения при смене суммы
            setPaymentErrorMessage('');
        }
    };
    
    const handleCustomInputFocus = () => {
        setIsCustomSelected(true);
        setPaymentSuccessMessage(''); // Сбрасываем сообщения при фокусе
        setPaymentErrorMessage('');
        if (customAmount === '') {
             // Automatically set minimum if empty when focusing
             setCustomAmount(String(MIN_CUSTOM_AMOUNT));
             setAmount(MIN_CUSTOM_AMOUNT);
        }
    };

    const pointsToReceive = Math.floor(amount * 100);

    const isValidAmount = !isCustomSelected ? amount >= MIN_CUSTOM_AMOUNT :
                          !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) >= MIN_CUSTOM_AMOUNT;

    const handlePayment = async () => {
        if (!isValidAmount || isProcessingPayment) return;
        
        setIsProcessingPayment(true);
        setPaymentSuccessMessage('');
        setPaymentErrorMessage('');
        
        console.log(`Initiating SIMULATED payment for $${amount}`);
        try {
            const response = await api('/payment/record-simulated', {
                method: 'POST',
                body: { amount_usd: amount }
            }); 
            
            const newPaymentData = response.payment;
            const newBalance = response.new_balance;
            console.log("Simulated payment successful:", newPaymentData);
            
            setPaymentSuccessMessage(`Successfully purchased ${newPaymentData.amount_points} points!`);
            
            // --- Добавляем лог для проверки --- 
            console.log(`[BillingPage] Checking before updateUser: typeof newBalance = ${typeof newBalance}, value = ${newBalance}`);
            console.log(`[BillingPage] Checking before updateUser: typeof updateUser = ${typeof updateUser}`);
            // --- Конец лога ---
            
            // Обновляем баланс в контексте
            if (updateUser && typeof newBalance === 'number') {
                updateUser({ balance_points: newBalance });
            }
            
            // Теперь fetchHistory доступна здесь
            await fetchHistory(); 
            
        } catch (error) { 
            console.error("Simulated payment failed:", error);
            const errorMsg = error.error || error.message || 'Failed to record payment. Please try again.';
            setPaymentErrorMessage(errorMsg);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    return (
        <div className={styles.billingContainer}>
            <h1>Billing & Payments</h1>
            <p>Purchase points to use premium features. 1 Point = $0.01</p>
            
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
                        placeholder={`Min $${MIN_CUSTOM_AMOUNT}`}
                        className={`${styles.customAmountInput} ${isCustomSelected ? styles.selectedInput : ''}`}
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        onFocus={handleCustomInputFocus}
                        readOnly={isProcessingPayment} // Блокируем во время обработки
                    />
                </div>
                {isCustomSelected && customAmount !== '' && parseFloat(customAmount) < MIN_CUSTOM_AMOUNT && (
                    <p className={styles.warningText}>Minimum amount is ${MIN_CUSTOM_AMOUNT}</p>
                )}
                
                <div className={styles.summary}>
                    <span>You will receive:</span>
                    <span className={styles.pointsValue}>{isValidAmount ? `${pointsToReceive} points` : '- ' }</span> 
                </div>
                
                {paymentSuccessMessage && <p className={styles.successText}>{paymentSuccessMessage}</p>}
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
    );
}

export default BillingPage; 