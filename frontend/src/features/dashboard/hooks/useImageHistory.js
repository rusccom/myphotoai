import { useState, useEffect, useCallback } from 'react';
import { getGenerationHistory } from '../../../services/api';

export const useImageHistory = () => {
    const [pendingGenerations, setPendingGenerations] = useState([]);
    const [completedHistory, setCompletedHistory] = useState([]);
    const [allImages, setAllImages] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [historyPage, setHistoryPage] = useState(1);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const loadHistory = useCallback(async () => {
        setIsHistoryLoading(true);
        setHistoryPage(1);
        try {
            const historyData = await getGenerationHistory(1);
            const history = historyData.images || [];
            
            const pending = history.filter(
                img => img.status === 'Pending' || img.status === 'Running'
            );
            const completed = history.filter(
                img => img.status === 'Ready' || img.status === 'Failed'
            );
            
            setPendingGenerations(pending);
            setCompletedHistory(completed);
            setHasMoreHistory(historyData.has_next || false);
            setHistoryPage(historyData.current_page || 1);
        } catch (err) {
            console.error('Failed to load history:', err);
            setError(err.message || 'Failed to load generation history.');
        } finally {
            setIsHistoryLoading(false);
        }
    }, []);

    const loadMoreHistory = async () => {
        if (isHistoryLoadingMore || !hasMoreHistory) return;

        setIsHistoryLoadingMore(true);
        try {
            const nextPage = historyPage + 1;
            const historyData = await getGenerationHistory(nextPage);
            const newHistory = historyData.images || [];

            const newCompleted = newHistory.filter(img => 
                (img.status === 'Ready' || img.status === 'Failed') &&
                !completedHistory.some(existing => existing.id === img.id)
            );

            setCompletedHistory(prev => [...prev, ...newCompleted]);
            setHasMoreHistory(historyData.has_next || false);
            setHistoryPage(historyData.current_page || nextPage);
        } catch (err) {
            console.error('Failed to load more history:', err);
        } finally {
            setIsHistoryLoadingMore(false);
        }
    };

    // Combine pending and completed, sorted by date
    useEffect(() => {
        const combined = [...pendingGenerations, ...completedHistory];
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAllImages(combined);
    }, [pendingGenerations, completedHistory]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // WebSocket handler for image updates (replaces polling)
    const handleImageUpdate = useCallback((updatedImage) => {
        console.log('[useImageHistory] Received image update:', updatedImage);
        
        const imageStatus = updatedImage.status?.toLowerCase();
        
        // Найти изображение в pending
        setPendingGenerations(prev => {
            const index = prev.findIndex(img => img.id === updatedImage.id);
            
            if (index !== -1) {
                // Изображение найдено в pending
                if (imageStatus === 'ready' || imageStatus === 'failed') {
                    // Перемещаем в completed
                    setCompletedHistory(prevCompleted => {
                        // Проверяем, нет ли уже в completed
                        const existsInCompleted = prevCompleted.some(img => img.id === updatedImage.id);
                        if (!existsInCompleted) {
                            return [updatedImage, ...prevCompleted];
                        }
                        return prevCompleted;
                    });
                    
                    // Убираем из pending
                    return prev.filter(img => img.id !== updatedImage.id);
                } else {
                    // Обновляем статус в pending (Running, etc)
                    const newPending = [...prev];
                    newPending[index] = { ...newPending[index], ...updatedImage };
                    return newPending;
                }
            } else {
                // Изображение не найдено в pending, возможно уже в completed
                // Обновляем в completed если есть
                setCompletedHistory(prevCompleted => {
                    const completedIndex = prevCompleted.findIndex(img => img.id === updatedImage.id);
                    if (completedIndex !== -1) {
                        const newCompleted = [...prevCompleted];
                        newCompleted[completedIndex] = updatedImage;
                        return newCompleted;
                    }
                    return prevCompleted;
                });
                return prev;
            }
        });
    }, []);

    return {
        allImages,
        pendingGenerations,
        completedHistory,
        isHistoryLoading,
        hasMoreHistory,
        isHistoryLoadingMore,
        error,
        setPendingGenerations,
        setCompletedHistory,
        loadHistory,
        loadMoreHistory,
        handleImageUpdate, // Экспортируем для WebSocket
    };
};

