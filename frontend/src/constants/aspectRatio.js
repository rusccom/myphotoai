/**
 * Универсальные константы для Aspect Ratio.
 * Используется во всех компонентах генерации изображений.
 */

export const ASPECT_RATIO_OPTIONS = ['3:4', '9:16', '1:1', '4:3', '16:9'];

export const ASPECT_RATIO_LABELS = {
    '3:4': '3:4 Portrait (Instagram)',
    '9:16': '9:16 (Stories/Reels)',
    '1:1': '1:1 Square',
    '4:3': '4:3 Landscape',
    '16:9': '16:9 Widescreen'
};

// Маппинг для API (Flux 2 Pro использует другие названия)
export const ASPECT_RATIO_TO_IMAGE_SIZE = {
    '3:4': 'portrait_4_3',
    '9:16': 'portrait_16_9',
    '1:1': 'square',
    '4:3': 'landscape_4_3',
    '16:9': 'landscape_16_9',
};
