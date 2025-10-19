import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// WebSocket всегда подключается к корню сервера, не к /api
const WS_BASE_URL = process.env.REACT_APP_WS_BASE_URL || 'http://localhost:5000';

/**
 * Hook для подключения к WebSocket серверу и получения real-time обновлений
 * @param {number} userId - ID пользователя
 * @param {function} onImageUpdate - Callback для обновления изображения
 * @param {function} onReconnect - Callback при переподключении (опционально)
 * @returns {object} socket instance
 */
export const useWebSocket = (userId, onImageUpdate, onReconnect) => {
    const socketRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    // Мемоизируем callback для предотвращения лишних переподключений
    const handleImageUpdate = useCallback((data) => {
        console.log('[WebSocket] Received image_updated event:', data);
        if (onImageUpdate) {
            onImageUpdate(data);
        }
    }, [onImageUpdate]);

    useEffect(() => {
        // Подключаемся только если userId есть
        if (!userId) {
            console.log('[WebSocket] User ID not provided, skipping connection');
            return;
        }

        console.log('[WebSocket] Initializing connection to:', WS_BASE_URL, 'for user:', userId);

        // Создаем WebSocket соединение
        const socket = io(WS_BASE_URL, {
            path: '/socket.io',  // Путь к Socket.IO на сервере
            withCredentials: true,
            transports: ['websocket', 'polling'], // Попробуем WebSocket сначала, потом polling
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: maxReconnectAttempts,
        });

        // Обработчик успешного подключения
        socket.on('connect', () => {
            console.log('[WebSocket] Connected. Socket ID:', socket.id);
            reconnectAttemptsRef.current = 0;

            // Присоединяемся к room пользователя
            socket.emit('join_user_room', { user_id: userId });
        });

        // Обработчик подтверждения подключения к room
        socket.on('room_joined', (data) => {
            console.log('[WebSocket] Joined room:', data.room);
        });

        // Обработчик получения обновления изображения
        socket.on('image_updated', handleImageUpdate);

        // Обработчик отключения
        socket.on('disconnect', (reason) => {
            console.log('[WebSocket] Disconnected. Reason:', reason);
            
            if (reason === 'io server disconnect') {
                // Сервер принудительно отключил, переподключаемся
                socket.connect();
            }
        });

        // Обработчик переподключения
        socket.on('reconnect', (attemptNumber) => {
            console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
            
            // Синхронизация при переподключении
            if (onReconnect) {
                onReconnect();
            }
        });

        // Обработчик попытки переподключения
        socket.on('reconnect_attempt', (attemptNumber) => {
            reconnectAttemptsRef.current = attemptNumber;
            console.log('[WebSocket] Reconnect attempt', attemptNumber);
        });

        // Обработчик ошибки переподключения
        socket.on('reconnect_error', (error) => {
            console.error('[WebSocket] Reconnect error:', error);
        });

        // Обработчик неудачи переподключения
        socket.on('reconnect_failed', () => {
            console.error('[WebSocket] Reconnect failed after', maxReconnectAttempts, 'attempts');
        });

        // Обработчик ошибок
        socket.on('error', (error) => {
            console.error('[WebSocket] Error:', error);
        });

        // Обработчик connect_error
        socket.on('connect_error', (error) => {
            console.error('[WebSocket] Connection error:', error.message);
        });

        socketRef.current = socket;

        // Cleanup при unmount
        return () => {
            console.log('[WebSocket] Cleaning up connection');
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('reconnect');
                socket.off('reconnect_attempt');
                socket.off('reconnect_error');
                socket.off('reconnect_failed');
                socket.off('error');
                socket.off('connect_error');
                socket.off('image_updated');
                socket.off('room_joined');
                socket.disconnect();
            }
        };
    }, [userId, handleImageUpdate, onReconnect]);

    return socketRef.current;
};

