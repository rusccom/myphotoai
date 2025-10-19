import React from 'react';
import styles from './CustomSelect.module.css';

const CustomSelect = ({
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    disabled = false,
    label = null,
    className = '',
    allowEmpty = true,
    emptyLabel = 'None'
}) => {
    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value);
        }
    };

    return (
        <div className={`${styles.selectWrapper} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.selectContainer}>
                <select
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    className={`${styles.select} ${disabled ? styles.disabled : ''}`}
                >
                    {allowEmpty && (
                        <option value="">{emptyLabel}</option>
                    )}
                    {options.map((option) => {
                        if (typeof option === 'string') {
                            return (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            );
                        } else if (option.value !== undefined) {
                            return (
                                <option key={option.value} value={option.value}>
                                    {option.label || option.value}
                                </option>
                            );
                        }
                        return null;
                    })}
                </select>
                <div className={styles.arrow}>
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default CustomSelect;

