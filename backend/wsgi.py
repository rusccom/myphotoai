from backend.app import create_app, socketio

app = create_app()

# Для запуска через socketio (с WebSocket support)
# В продакшене использовать: gunicorn --worker-class gevent -w 1 backend.wsgi:app
if __name__ == '__main__':
    # Проверяем что SocketIO был инициализирован (не во время миграции)
    if socketio.server:
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    else:
        # Fallback для запуска без SocketIO (например, для миграций)
        app.run(host='0.0.0.0', port=5000, debug=True) 