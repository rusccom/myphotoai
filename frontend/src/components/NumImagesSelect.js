import React from 'react';
import styles from './NumImagesSelect.module.css'; // Можно добавить стили, если нужно

const NUM_IMAGE_OPTIONS = [1, 2, 4, 8];

function NumImagesSelect({ id, label, value, onChange, disabled }) {
    
    // Обработчик для преобразования значения в число перед вызовом onChange
    const handleChange = (event) => {
        const newValue = parseInt(event.target.value, 10);
        onChange(newValue);
    };

    return (
        <div>
            <label htmlFor={id} className={styles.label}>{label}</label>
            <select 
                id={id} 
                value={value} 
                onChange={handleChange} 
                disabled={disabled} 
                className="select-custom" // Используем существующий класс для стилей
            >
                {NUM_IMAGE_OPTIONS.map(num => (
                    <option key={num} value={num}>
                        {num}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default NumImagesSelect; 