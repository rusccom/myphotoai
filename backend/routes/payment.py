from flask import Blueprint, request, jsonify, current_app, redirect, url_for
from flask_login import login_required, current_user
import stripe
import os
from datetime import datetime

from ..app import db
from ..models import User, SubscriptionType, Payment
from ..utils.notifications import send_telegram_message
from sqlalchemy import text
import logging

bp = Blueprint('payment', __name__)

# Инициализация Stripe при загрузке модуля
# Ключи берутся из Config, который загружает их из .env
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# TODO: Замените на ваши реальные Price ID из Stripe Dashboard
# Или используйте Lookup Keys
PRICE_IDS = {
    'plus': 'price_YOUR_PLUS_PRICE_ID', 
    'premium': 'price_YOUR_PREMIUM_PRICE_ID'
}

@bp.route('/create-checkout-session', methods=['POST'])
@login_required
def create_checkout_session():
    data = request.get_json()
    price_lookup_key_or_id = data.get('priceId') # Ожидаем ID или Lookup Key от фронтенда

    if not price_lookup_key_or_id:
         return jsonify({"error": "Price ID or Lookup Key is required"}), 400

    # Определяем тип подписки по ID (или ключу)
    subscription_plan = None
    if price_lookup_key_or_id == PRICE_IDS['plus']: # Проверяем по ID
        subscription_plan = SubscriptionType.PLUS
    elif price_lookup_key_or_id == PRICE_IDS['premium']:
         subscription_plan = SubscriptionType.PREMIUM
    # TODO: Добавить проверку по Lookup Keys, если вы их используете
    # else:
        # try:
        #    price = stripe.Price.list(lookup_keys=[price_lookup_key_or_id], expand=['data.product']).data[0]
        #    # Определить план по продукту или метаданным цены
        # except stripe.error.InvalidRequestError:
        #     return jsonify({"error": "Invalid Price Lookup Key"}), 400

    if not subscription_plan:
        return jsonify({"error": "Invalid Price ID provided"}), 400

    # URL для редиректа после успеха/отмены (нужно будет создать эти страницы на фронтенде)
    # Используем переменные окружения или константы для базового URL фронтенда
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000') # Убедитесь, что порт совпадает
    success_url = f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{frontend_url}/payment/cancel"

    try:
        # Создаем Stripe Customer, если его еще нет
        customer_id = current_user.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                # Можно добавить name, metadata и т.д.
                metadata={
                    'user_id': current_user.id
                }
            )
            customer_id = customer.id
            # Сохраняем customer_id в нашей БД
            current_user.stripe_customer_id = customer_id
            db.session.add(current_user)
            db.session.commit()

        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card', 'apple_pay', 'google_pay'], # Добавляем Apple/Google Pay
            line_items=[
                {
                    'price': price_lookup_key_or_id, # Используем ID или Lookup Key
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
             # Передаем user_id в метаданные сессии, чтобы использовать в вебхуке
            metadata={
                'user_id': current_user.id
            },
            # Если у пользователя уже есть подписка, и он меняет план,
            # можно передать subscription ID для обновления:
            # subscription=current_user.stripe_subscription_id, # Раскомментировать при реализации смены плана
        )
        # Возвращаем ID сессии на фронтенд
        return jsonify({'sessionId': checkout_session.id})

    except stripe.error.StripeError as e:
        print(f"Stripe Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        db.session.rollback() # Откатываем сохранение customer_id, если оно было
        print(f"Error creating checkout session: {e}")
        return jsonify({'error': 'Failed to create checkout session'}), 500


@bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')

    if not endpoint_secret:
         print("Stripe webhook secret not configured.")
         return jsonify(success=False), 500
    if not sig_header:
        print("Missing Stripe-Signature header.")
        return jsonify(success=False), 400
    if not payload:
         print("Missing webhook payload.")
         return jsonify(success=False), 400

    event = None
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        print(f"Invalid webhook payload: {e}")
        return jsonify(success=False), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        print(f"Invalid webhook signature: {e}")
        return jsonify(success=False), 400

    # Обработка событий
    print(f"Received Stripe event: {event['type']}")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Получаем user_id из метаданных сессии (если передавали)
        user_id = session.get('metadata', {}).get('user_id')
        stripe_customer_id = session.get('customer')
        stripe_subscription_id = session.get('subscription')

        if not user_id and stripe_customer_id:
             # Если user_id нет в метаданных сессии, ищем пользователя по customer_id
            user = User.query.filter_by(stripe_customer_id=stripe_customer_id).first()
            if user: user_id = user.id

        if user_id and stripe_subscription_id:
            user = User.query.get(user_id)
            if user:
                # Получаем детали подписки, чтобы узнать Price ID
                try:
                    subscription = stripe.Subscription.retrieve(stripe_subscription_id)
                    price_id = subscription['items']['data'][0]['price']['id']

                    # Определяем тип подписки и обновляем пользователя
                    new_sub_type = None
                    if price_id == PRICE_IDS['plus']:
                         new_sub_type = SubscriptionType.PLUS
                    elif price_id == PRICE_IDS['premium']:
                         new_sub_type = SubscriptionType.PREMIUM

                    if new_sub_type:
                         # Устанавливаем подписку (set_subscription обновит даты)
                         # Устанавливаем длительность = 30 дней (или взять из Stripe?)
                         user.set_subscription(new_sub_type, duration_days=30)
                         user.stripe_subscription_id = stripe_subscription_id
                         # Убедимся, что customer_id тоже сохранен
                         if not user.stripe_customer_id:
                             user.stripe_customer_id = stripe_customer_id
                         db.session.commit()
                         print(f"User {user.id} subscribed to {new_sub_type.value}")
                    else:
                         print(f"Unknown Price ID {price_id} for subscription {stripe_subscription_id}")

                except stripe.error.StripeError as e:
                    print(f"Stripe error retrieving subscription {stripe_subscription_id}: {e}")
                except Exception as e:
                    print(f"Error updating user subscription: {e}")
                    db.session.rollback()
            else:
                print(f"User with ID {user_id} not found for subscription {stripe_subscription_id}")
        else:
            print(f"Missing user_id or subscription_id in checkout.session.completed event: {session.get('id')}")

    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        stripe_customer_id = subscription.get('customer')
        if stripe_customer_id:
            user = User.query.filter_by(stripe_customer_id=stripe_customer_id).first()
            if user and user.stripe_subscription_id == subscription.get('id'):
                 # Сбрасываем подписку на бесплатную
                 user.set_subscription(SubscriptionType.FREE)
                 user.stripe_subscription_id = None # Очищаем ID подписки
                 db.session.commit()
                 print(f"Subscription {subscription.get('id')} cancelled for user {user.id}")
            else:
                 print(f"User not found or subscription mismatch for customer {stripe_customer_id}")

    # TODO: Обработать другие события, если нужно (invoice.payment_failed, customer.subscription.updated)

    return jsonify(success=True)

# Эндпоинт для записи симулированного успешного платежа (покупки очков)
@bp.route('/record-simulated', methods=['POST'])
@login_required
def record_simulated_payment():
    data = request.get_json()
    if not data or 'amount_usd' not in data:
        return jsonify({'error': 'Amount (amount_usd) is required'}), 400

    try:
        amount_usd = data['amount_usd']
        # Простая валидация суммы
        amount_float = float(amount_usd)
        if amount_float < 0.01: # Минимальная сумма (например, 1 цент)
            return jsonify({'error': 'Invalid amount'}), 400
        
        # Создаем запись о платеже
        # Используем __init__ модели Payment, который посчитает amount_points
        new_payment = Payment(
            user_id=current_user.id,
            amount_usd=amount_float, # Передаем как число
            status='completed' # Сразу считаем успешным
            # transaction_id можно оставить пустым или сгенерировать заглушку
        )
        db.session.add(new_payment)
        db.session.commit()
        logging.info(f"[SimulatedPayment] Recorded payment {new_payment.id} for user {current_user.id}, amount ${amount_float}")
        # --- Отправляем уведомление в Telegram ---
        try:
            message = (
                f"💰 Симулированный платеж!\n"
                f"UserID: {current_user.id}\n"
                f"Email: {current_user.email}\n"
                f"Сумма USD: {new_payment.amount_usd}\n"
                f"Начислено баллов: {new_payment.amount_points}"
            )
            send_telegram_message(message)
        except Exception as e_notify:
            logging.error(f"Failed to send Telegram notification for simulated payment (user {current_user.id}): {e_notify}")
        # --- Конец отправки уведомления ---

        # Получаем обновленный баланс пользователя из представления
        balance = 0
        try:
            sql = text("SELECT balance_points FROM user_balance WHERE user_id = :user_id")
            result = db.session.execute(sql, {'user_id': current_user.id}).fetchone()
            if result and result[0] is not None: # Проверяем, что результат не None
                # Преобразуем результат в integer перед использованием
                balance = int(result[0]) 
        except Exception as balance_e:
            logging.error(f"[SimulatedPayment] Failed to fetch updated balance for user {current_user.id}: {balance_e}")
            # Продолжаем выполнение, вернем 0 или последнее известное значение?
            # Лучше вернуть сам платеж, а фронтенд обновит баланс через /auth/status

        return jsonify({
            'message': 'Simulated payment recorded successfully',
            'payment': new_payment.to_dict(),
            'new_balance': balance # Возвращаем новый баланс
        }), 201

    except ValueError:
        return jsonify({'error': 'Invalid amount format'}), 400
    except Exception as e:
        db.session.rollback()
        logging.exception(f"[SimulatedPayment] Error recording payment for user {current_user.id}")
        return jsonify({'error': 'Failed to record payment'}), 500

# TODO: Добавить маршруты для создания сессий Stripe Checkout, вебхуков и т.д. 