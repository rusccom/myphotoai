import React, { useState } from 'react';
import ImageCard from './ImageCard';
import styles from './PhotoGallery.module.css';

const PhotoGallery = ({ 
    allImages, 
    isHistoryLoading, 
    hasMoreHistory,
    isHistoryLoadingMore,
    onLoadMore,
    onImageAction,
    onOpenModal
}) => {
    const [actionsMenuOpenForId, setActionsMenuOpenForId] = useState(null);

    const handleDownloadImage = async (imageUrl, imageName, event) => {
        if (event) event.stopPropagation();
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', imageName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    };

    const handleShareImage = async (imageUrl, imageName, event) => {
        if (event) event.stopPropagation();

        const title = "Check out this image I created!";
        const text = "I made this image with MyPhotoAI. You can create your own too! Check it out:";
        const siteUrl = window.location.origin;

        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], imageName, { type: blob.type });

            const shareDataWithFile = {
                files: [file],
                title: title,
                text: text,
            };
            const shareDataWithUrl = {
                title: title,
                text: text,
                url: siteUrl,
            };

            let canShareFiles = false;
            if (navigator.canShare) {
                canShareFiles = navigator.canShare(shareDataWithFile);
            }

            if (canShareFiles) {
                await navigator.share(shareDataWithFile);
            } else if (navigator.share) {
                await navigator.share(shareDataWithUrl);
            } else {
                await navigator.clipboard.writeText(imageUrl);
                alert('Image link copied to clipboard!');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                try {
                    await navigator.clipboard.writeText(imageUrl);
                    alert('Could not share, but the image link was copied to your clipboard!');
                } catch (copyError) {
                    console.error('Failed to copy link to clipboard:', copyError);
                    alert('Sharing failed and could not copy link to clipboard.');
                }
            }
        }
    };

    if (allImages.length === 0 && !isHistoryLoading) {
        return (
            <section className={styles.resultsSection}>
                <p className={styles.emptyText}>
                    Your photo generations and upscales will appear here.
                </p>
            </section>
        );
    }

    return (
        <section className={styles.resultsSection}>
            <div className={styles.imageList}>
                {isHistoryLoading && allImages.length === 0 ? (
                    <div className={styles.loadingSpinner}></div>
                ) : (
                    allImages.map(img => (
                        <ImageCard
                            key={img.id}
                            img={img}
                            onOpenModal={onOpenModal}
                            onAction={onImageAction}
                            actionsMenuOpenForId={actionsMenuOpenForId}
                            setActionsMenuOpenForId={setActionsMenuOpenForId}
                            onDownload={handleDownloadImage}
                            onShare={handleShareImage}
                        />
                    ))
                )}
            </div>
            
            {hasMoreHistory && (
                <div className={styles.loadMoreContainer}>
                    <button 
                        onClick={onLoadMore} 
                        disabled={isHistoryLoadingMore} 
                        className={styles.loadMoreButton}
                    >
                        {isHistoryLoadingMore ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </section>
    );
};

export default PhotoGallery;

