import React, { useState, useEffect } from 'react';
import styles from './GenerationTimer.module.css'; // Создадим стили для таймера

function GenerationTimer({ startTime }) {
    const [elapsedTime, setElapsedTime] = useState('0.0');

    useEffect(() => {
        // Если startTime не предоставлен или невалиден, показываем --.- и выходим
        if (!startTime) {
            console.warn("GenerationTimer: startTime prop is missing.");
            return;
        }

        const startTimestamp = Date.parse(startTime);
        if (isNaN(startTimestamp)) {
            console.error("GenerationTimer: Invalid startTime prop:", startTime);
            return;
        }

        // Немедленный расчет начального времени, чтобы избежать задержки в 100 мс
        const calculateTime = () => {
            const now = Date.now();
            // Убедимся, что разница не отрицательная
            const difference = Math.max(0, now - startTimestamp);

            const totalSeconds = difference / 1000;
            // Используем toFixed(1) для округления до 1 знака после запятой
            setElapsedTime(totalSeconds.toFixed(1));
        };

        calculateTime(); // Вызываем сразу для установки начального значения

        // Обновляем немного реже, т.к. точность до десятых
        const intervalId = setInterval(calculateTime, 100); 

        // Очистка интервала при размонтировании компонента или изменении startTime
        return () => clearInterval(intervalId);

    }, [startTime]); // Зависимость только от startTime

    return (
        <div className={styles.timerContainer}>
            <div className={styles.spinner}>
                <span className={styles.timerText}>{elapsedTime}</span>
            </div>
        </div>
    );
}

export default GenerationTimer; 