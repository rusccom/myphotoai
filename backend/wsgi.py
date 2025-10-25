"""
WSGI Entry Point для продакшн сервера (Gunicorn + DigitalOcean App Platform)

Gunicorn запускает Flask app напрямую, Flask-SocketIO автоматически
оборачивает его своим middleware для поддержки WebSocket.

Запуск: gunicorn --worker-class gevent -w 1 backend.wsgi:app
"""
from backend.app import create_app, socketio

# Создаем Flask приложение
app = create_app()

# Flask-SocketIO автоматически регистрирует свой middleware на app
# при вызове socketio.init_app(app) в create_app()
# Поэтому gunicorn может запускать app напрямую с поддержкой WebSocket

if __name__ == '__main__':
    # Для локальной разработки используйте run_dev.py вместо этого файла!
    # Этот блок нужен только для тестирования wsgi.py напрямую
    if socketio.server:
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    else:
        # Fallback для запуска без SocketIO (например, для миграций)
        app.run(host='0.0.0.0', port=5000, debug=True) 