import React from 'react';
import styles from './UniversalSubmitButton.module.css';

function UniversalSubmitButton({
  actionType, // Legacy prop
  numImages = 1, // Legacy prop
  costs, // Legacy prop
  isSubmitting,
  isDisabled, // Legacy prop
  disabled, // New prop
  baseText = "Start Generation", // Legacy prop
  customText, // Legacy prop
  actionCost, // New prop - cost in points
  actionName = "Start", // New prop - name of action
  submitText, // New prop - custom button text
}) {

  // Функция для расчета стоимости (legacy mode)
  const calculateCost = () => {
    if (!costs || !actionType || !costs[actionType]) {
      return null;
    }
    if (actionType === 'upscale') {
        return costs[actionType];
    }
    return costs[actionType] * numImages;
  };

  // Определяем стоимость: либо из нового пропса, либо из старого расчета
  const cost = actionCost !== undefined ? actionCost : calculateCost();
  
  // Определяем disabled состояние
  const isButtonDisabled = isSubmitting || disabled || isDisabled || (cost === null && actionCost === undefined);

  // Формируем текст для кнопки
  const getButtonText = () => {
    if (isSubmitting) {
      return `${actionName}ing...`;
    }
    
    // Если передан submitText, используем его
    if (submitText) {
      if (cost !== null && cost !== undefined) {
        return `${submitText} (Cost: ${cost} ${cost === 1 ? 'point' : 'points'})`;
      }
      return submitText;
    }
    
    // Legacy mode: используем старый формат
    const baseTextToShow = customText || baseText || "Start";
    if (cost !== null && cost !== undefined) {
      return `${baseTextToShow} (Cost: ${cost} ${cost === 1 ? 'point' : 'points'})`;
    }
    return baseTextToShow;
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