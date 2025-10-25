import React from 'react';
import styles from './UniversalSubmitButton.module.css';

function UniversalSubmitButton({
  isSubmitting,
  disabled,
  actionCost, // For complex calculations (e.g., NanoBanana)
  baseCost, // Base cost per operation
  quantity = 1, // Number of images/operations
}) {

  // Автоматический расчет: baseCost × quantity
  const calculatedCost = baseCost !== undefined && quantity !== undefined 
    ? baseCost * quantity 
    : undefined;

  // Приоритет: actionCost (для сложных расчетов) → calculatedCost
  const cost = actionCost !== undefined ? actionCost : calculatedCost;
  
  // Определяем disabled состояние
  const isButtonDisabled = isSubmitting || disabled || cost === null || cost === undefined;

  // Формируем текст для кнопки
  const getButtonText = () => {
    if (isSubmitting) {
      return "GOing...";
    }
    
    if (cost !== null && cost !== undefined) {
      return `GO (Cost: ${cost} ${cost === 1 ? 'point' : 'points'})`;
    }
    
    return "GO";
  };

  return (
    <button
      type="submit"
      disabled={isButtonDisabled}
      className={styles.submitButton}
      title={isButtonDisabled ? "Please fill out all required fields" : ""}
    >
      {getButtonText()}
    </button>
  );
}

export default UniversalSubmitButton; 