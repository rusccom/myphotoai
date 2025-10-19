"""
Development server runner with WebSocket support
Используется вместо 'flask run' для поддержки WebSocket
"""
import os
import sys

# Добавляем текущую директорию в путь
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import create_app, socketio

if __name__ == '__main__':
    app = create_app()
    
    # Запускаем с WebSocket support
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=True,  # Auto-reload при изменении кода
        log_output=True
    )

