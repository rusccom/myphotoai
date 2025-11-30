import React from 'react';
import GenerationTimer from '../../../../components/GenerationTimer';
import styles from './PhotoGallery.module.css';

const formatCssAspectRatio = (ratioStr) => {
    if (!ratioStr || typeof ratioStr !== 'string') return '1 / 1';
    const parts = ratioStr.split(':');
    if (parts.length !== 2) return '1 / 1';
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (isNaN(w) || isNaN(h) || w === 0 || h === 0) return '1 / 1';
    return `${w} / ${h}`;
};

// Badge configuration for all generation types
const BADGE_CONFIG = {
    upscale: {
        text: 'Upscaled',
        className: 'badgeUpscale'
    },
    model_photo: {
        text: 'Model Gen',
        className: 'badgeModelPhoto'
    },
    text_to_image: {
        text: 'Text Gen',
        className: 'badgeTextToImage'
    },
    try_on: {
        text: 'Try-On',
        className: 'badgeTryOn'
    },
    edit_photo: {
        text: 'Edit Photo',
        className: 'badgeEditPhoto'
    }
};

const DEFAULT_BADGE = {
    text: 'Generated',
    className: 'badgeDefault'
};

const ImageCard = ({ 
    img, 
    onOpenModal, 
    onAction,
    actionsMenuOpenForId,
    setActionsMenuOpenForId,
    onDownload,
    onShare
}) => {
    const isPending = img.status.toLowerCase() === 'pending' || 
                      img.status.toLowerCase() === 'running';
    const isReady = img.status.toLowerCase() === 'ready';
    const isFailed = img.status.toLowerCase() === 'failed';
    const displayImageUrl = isReady ? img.signed_url : null;

    let altText = img.prompt || 'Generated content';
    if (img.generation_type === 'upscale') {
        altText = 'Upscaled result';
        if (img.prompt) altText += ` (${img.prompt})`;
    }

    const getBadgeConfig = () => {
        const config = BADGE_CONFIG[img.generation_type];
        return config || DEFAULT_BADGE;
    };

    return (
        <div className={`${styles.imageCard} ${isPending ? styles.pendingCard : ''}`}>
            {isPending && (
                <div
                    className={styles.imagePlaceholder}
                    style={{ aspectRatio: formatCssAspectRatio(img.aspect_ratio) }}
                >
                    <GenerationTimer 
                        startTime={img.created_at} 
                        prefixText={`${img.status}...`} 
                    />
                </div>
            )}

            {isReady && displayImageUrl && (
                <>
                    <img
                        src={displayImageUrl}
                        alt={altText}
                        className={`${styles.generatedImage} ${styles.fadeIn}`}
                        loading="lazy"
                        onClick={() => onOpenModal(displayImageUrl)}
                        style={{ 
                            cursor: 'pointer',
                            aspectRatio: formatCssAspectRatio(img.aspect_ratio) 
                        }}
                    />
                    
                    {actionsMenuOpenForId === img.id ? (
                        <div className={styles.imageCardActions}>
                            <button 
                                className={styles.actionButton} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onAction('Try On', img, e); 
                                    setActionsMenuOpenForId(null); 
                                }}
                                title="Try On"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 8l4.5-5h11L22 8l-5 2v10c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V10L2 8z"></path>
                                    <path d="M2 8l6-5"></path>
                                    <path d="M22 8l-6-5"></path>
                                </svg>
                            </button>
                            <button 
                                className={styles.actionButton} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onAction('Video', img, e); 
                                    setActionsMenuOpenForId(null); 
                                }}
                                title="Create Video"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 7l-7 5 7 5V7z"></path>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                </svg>
                            </button>
                            <button 
                                className={styles.actionButton} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onAction('Upscale', img, e); 
                                    setActionsMenuOpenForId(null); 
                                }}
                                title="Upscale Image"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="15 3 21 3 21 9"></polygon>
                                    <polygon points="9 21 3 21 3 15"></polygon>
                                    <line x1="21" y1="3" x2="14" y2="10"></line>
                                    <line x1="3" y1="21" x2="10" y2="14"></line>
                                </svg>
                            </button>
                            <button 
                                className={styles.actionButton}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onShare(displayImageUrl, `image-${img.id}.png`, e); 
                                    setActionsMenuOpenForId(null); 
                                }}
                                title="Share Image"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                    <polyline points="16 6 12 2 8 6"></polyline>
                                    <line x1="12" y1="2" x2="12" y2="15"></line>
                                </svg>
                            </button>
                            <button 
                                className={styles.actionButton} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onDownload(displayImageUrl, `image-${img.id}.png`, e); 
                                    setActionsMenuOpenForId(null); 
                                }}
                                title="Download image"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className={styles.menuButtonContainer}>
                            <button 
                                className={styles.menuButton}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setActionsMenuOpenForId(img.id);
                                }}
                                title="Actions"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 14c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                </svg>
                            </button>
                        </div>
                    )}
                    
                    {img.status === 'Ready' && img.generation_type && (
                        <span className={`${styles.generationTypeBadge} ${styles[getBadgeConfig().className]}`}>
                            {getBadgeConfig().text}
                        </span>
                    )}
                </>
            )}

            {(isFailed || (isReady && !displayImageUrl)) && (
                <div 
                    className={styles.imagePlaceholder}
                    style={{ aspectRatio: formatCssAspectRatio(img.aspect_ratio) }}
                >
                    {isFailed ? 'Generation Failed' : 'Image Unavailable'}
                </div>
            )}
        </div>
    );
};

export default ImageCard;

