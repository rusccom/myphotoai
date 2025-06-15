import React from 'react';
import styles from './UniversalSubmitButton.module.css';

function UniversalSubmitButton({
  actionType,
  numImages = 1,
  costs,
  isSubmitting,
  isDisabled,
  baseText = "Start Generation",
  customText, // For buttons like "Upscale" that don't depend on numImages
}) {

  // Функция для расчета стоимости
  const calculateCost = () => {
    if (!costs || !actionType || !costs[actionType]) {
      return null; // Если цены не загружены или тип действия не найден
    }
    // Для апскейла и других действий, где стоимость не зависит от кол-ва, считаем за 1
    if (actionType === 'upscale') {
        return costs[actionType];
    }
    return costs[actionType] * numImages;
  };

  const cost = calculateCost();

  // Формируем текст для кнопки
  const getButtonText = () => {
    if (isSubmitting) {
      return "Starting...";
    }
    // Используем единый текст для всех кнопок
    const baseTextToShow = "Start";
    if (cost !== null) {
      return `${baseTextToShow} (Cost: ${cost} ${cost === 1 ? 'point' : 'points'})`;
    }
    return baseTextToShow; // Fallback, если цена не может быть рассчитана
  };

  return (
    <button
      type="submit"
      disabled={isSubmitting || isDisabled || cost === null}
      className={styles.submitButton}
      title={isDisabled ? "Please fill out all required fields" : ""}
    >
      {getButtonText()}
    </button>
  );
}

export default UniversalSubmitButton; 