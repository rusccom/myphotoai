import logging
from flask import request
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_login import current_user
from ..app import socketio

@socketio.on('connect')
def handle_connect():
    """Обработчик подключения клиента к WebSocket"""
    if current_user.is_authenticated:
        logging.info(f'[WebSocket] User {current_user.id} ({current_user.email}) connected. SID: {request.sid}')
        emit('connected', {'message': 'Successfully connected to WebSocket', 'user_id': current_user.id})
    else:
        logging.warning(f'[WebSocket] Unauthenticated connection attempt. SID: {request.sid}')
        # Можно разрешить подключение, но не давать доступ к rooms
        emit('connected', {'message': 'Connected, but not authenticated'})

@socketio.on('disconnect')
def handle_disconnect():
    """Обработчик отключения клиента от WebSocket"""
    if current_user.is_authenticated:
        logging.info(f'[WebSocket] User {current_user.id} ({current_user.email}) disconnected. SID: {request.sid}')
    else:
        logging.info(f'[WebSocket] Anonymous user disconnected. SID: {request.sid}')

@socketio.on('join_user_room')
def handle_join_user_room(data):
    """
    Подписывает пользователя на его персональную комнату для получения обновлений.
    Каждый пользователь должен быть в room с именем 'user_{user_id}'.
    """
    if not current_user.is_authenticated:
        logging.warning(f'[WebSocket] Unauthenticated user tried to join room. SID: {request.sid}')
        emit('error', {'message': 'Authentication required'})
        return

    user_id = current_user.id
    requested_user_id = data.get('user_id')

    # Проверка: пользователь может присоединиться только к своей комнате
    if requested_user_id and requested_user_id != user_id:
        logging.warning(
            f'[WebSocket] User {user_id} tried to join room of user {requested_user_id}. Rejected. SID: {request.sid}'
        )
        emit('error', {'message': 'You can only join your own room'})
        return

    room = f'user_{user_id}'
    join_room(room)
    logging.info(f'[WebSocket] User {user_id} joined room: {room}. SID: {request.sid}')
    emit('room_joined', {'room': room, 'user_id': user_id})

@socketio.on('leave_user_room')
def handle_leave_user_room():
    """Отписывает пользователя от его персональной комнаты"""
    if not current_user.is_authenticated:
        return

    user_id = current_user.id
    room = f'user_{user_id}'
    leave_room(room)
    logging.info(f'[WebSocket] User {user_id} left room: {room}. SID: {request.sid}')
    emit('room_left', {'room': room})

@socketio.on('ping')
def handle_ping():
    """Обработчик ping для проверки соединения"""
    logging.debug(f'[WebSocket] Ping received from SID: {request.sid}')
    emit('pong', {'timestamp': request.sid})

# Error handler для WebSocket
@socketio.on_error_default
def default_error_handler(e):
    """Обработчик ошибок WebSocket"""
    logging.error(f'[WebSocket] Error occurred: {e}. SID: {request.sid}')
    emit('error', {'message': 'An error occurred', 'details': str(e)})

