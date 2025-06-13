from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from ..app import db # Используем .. для импорта из родительской папки (backend)
from ..models import User, SubscriptionType, Payment
from ..utils.notifications import send_telegram_message # <--- Добавляем импорт
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text # <-- Добавляем импорт text
import logging # Импортируем logging

bp = Blueprint('auth', __name__)

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # TODO: Добавить более строгую валидацию email и сложности пароля

    # Проверка, существует ли пользователь с таким email
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email address already registered"}), 400

    # Создание нового пользователя
    new_user = User(email=email)
    new_user.set_password(password)
    # Устанавливаем бесплатную подписку по умолчанию
    new_user.set_subscription(SubscriptionType.FREE)

    try:
        db.session.add(new_user)
        db.session.commit()
        # --- Отправляем уведомление в Telegram --- 
        try:
            message = f"🎉 Новый пользователь зарегистрирован!\nEmail: {new_user.email}\nUserID: {new_user.id}"
            send_telegram_message(message)
        except Exception as e_notify:
            logging.error(f"Failed to send Telegram notification for new user {new_user.id}: {e_notify}")
        # --- Конец отправки уведомления --- 
    except IntegrityError: # На случай гонки потоков, если email был добавлен между проверкой и коммитом
        db.session.rollback()
        return jsonify({"error": "Email address already registered"}), 400
    except Exception as e:
        db.session.rollback()
        # TODO: Логгировать ошибку e
        print(f"Error during registration: {e}") # Временный вывод для отладки
        return jsonify({"error": "Registration failed due to an internal error"}), 500

    # Сразу логиним пользователя после успешной регистрации
    login_user(new_user, remember=True) # remember=True устанавливает постоянную cookie сессии

    return jsonify({
        "message": "User registered and logged in successfully",
        "user": new_user.to_dict()
    }), 201 # 201 Created

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401 # 401 Unauthorized

    # Регистрируем пользователя в сессии Flask-Login
    login_user(user, remember=True) # remember=True для долгоживущей сессии

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict()
    }), 200

@bp.route('/logout', methods=['POST']) # Используем POST для logout, как рекомендует стандарт
@login_required # Доступно только для аутентифицированных пользователей
def logout():
    logout_user() # Удаляет пользователя из сессии
    return jsonify({"message": "Logout successful"}), 200

@bp.route('/status', methods=['GET'])
def status():
    # Проверяем, аутентифицирован ли текущий пользователь
    if current_user.is_authenticated:
        # Получаем стандартные данные пользователя
        user_data = current_user.to_dict()

        # Получаем баланс из представления user_balance
        balance = 0 # Значение по умолчанию
        try:
            sql = text("SELECT balance_points FROM user_balance WHERE user_id = :user_id")
            result = db.session.execute(sql, {'user_id': current_user.id}).fetchone()
            if result:
                balance = result[0] # balance_points - это первый столбец
            # Логгируем полученный баланс
            logging.info(f"[AuthStatus] Fetched balance for user {current_user.id}: {balance}")
        except Exception as e:
            # Логгируем ошибку, если не удалось получить баланс
            logging.exception(f"[AuthStatus] Failed to fetch balance for user {current_user.id}: {e}")
            # Не прерываем выполнение, просто баланс будет 0
        
        # Добавляем баланс к данным пользователя
        user_data['balance_points'] = balance

        # Возвращаем информацию о текущем пользователе с балансом
        return jsonify({
            "authenticated": True,
            "user": user_data
        }), 200
    else:
        # Пользователь не аутентифицирован
        return jsonify({"authenticated": False}), 200 # Можно вернуть 401, но 200 с флагом тоже ОК

# Новый маршрут для смены пароля
@bp.route('/change-password', methods=['POST'])
@login_required # Возвращаем декоратор на место
def change_password_route():
    # logging.info(f"[ChangePwd] Route hit by user {current_user.id if current_user.is_authenticated else 'ANONYMOUS'}")
    # --- Ручная проверка больше не нужна, т.к. есть @login_required ---
    # if not current_user.is_authenticated:
    #    logging.warning("[ChangePwd] User not authenticated (login_required disabled for CORS test)")
    #    return jsonify({"error": "Authentication required"}), 401 
    # --- Конец ручной проверки --- 
    
    # Логируем уже после @login_required
    logging.info(f"[ChangePwd] Route hit by authenticated user {current_user.id}")
    
    data = request.get_json()
    if not data:
        logging.warning("[ChangePwd] Request body is not JSON")
        return jsonify({"error": "Request body must be JSON"}), 400

    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        logging.warning(f"[ChangePwd] Missing current or new password for user {current_user.id}")
        return jsonify({"error": "Current password and new password are required"}), 400

    # Проверяем текущий пароль
    if not current_user.check_password(current_password):
        logging.warning(f"[ChangePwd] Invalid current password for user {current_user.id}")
        return jsonify({"error": "Invalid current password"}), 401 # Unauthorized или 400 Bad Request

    # TODO: Добавить проверку сложности нового пароля (длина и т.д.)
    if len(new_password) < 6:
        logging.warning(f"[ChangePwd] New password too short for user {current_user.id}")
        return jsonify({"error": "New password must be at least 6 characters long"}), 400

    # Устанавливаем новый пароль и сохраняем
    try:
        current_user.set_password(new_password)
        db.session.commit()
        logging.info(f"[ChangePwd] Password changed successfully for user {current_user.id}")
        return jsonify({"message": "Password changed successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logging.exception(f"[ChangePwd] Error saving new password for user {current_user.id}")
        return jsonify({"error": "An internal error occurred while changing password"}), 500

# Эндпоинт для получения истории платежей пользователя
@bp.route('/payment-history', methods=['GET'])
@login_required
def payment_history():
    try:
        # Получаем последние 50 платежей пользователя, сортируем по дате (сначала новые)
        payments = Payment.query.filter_by(user_id=current_user.id)\
                                .order_by(Payment.payment_time.desc())\
                                .limit(50)\
                                .all()
        
        # Сериализуем платежи с помощью добавленного метода to_dict()
        history_data = [p.to_dict() for p in payments]
        
        logging.info(f"[PaymentHistory] Fetched {len(history_data)} records for user {current_user.id}")
        return jsonify({'history': history_data}), 200

    except Exception as e:
        logging.exception(f"[PaymentHistory] Error fetching payment history for user {current_user.id}")
        return jsonify({"error": "Failed to retrieve payment history"}), 500

# TODO: Добавить маршруты для регистрации, входа, выхода и т.д.
# Пример:
# @bp.route('/register', methods=['POST'])
# def register():
#     pass 