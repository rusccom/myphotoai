from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import stripe
import os
from decimal import Decimal

from ..app import db
from ..models import User, Payment
from ..utils.costs import quote_points_for_amount, calculate_points_for_amount
import logging

bp = Blueprint('payment', __name__)

# Инициализация Stripe при загрузке модуля
# Ключи берутся из Config, который загружает их из .env
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

POINTS_PRODUCT_NAME = "Points top-up"

def _get_frontend_urls():
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    success_url = f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{frontend_url}/payment/cancel"
    return success_url, cancel_url

def _get_or_create_customer_id(user: User) -> str:
    if user.stripe_customer_id:
        return user.stripe_customer_id
    customer = stripe.Customer.create(
        email=user.email,
        metadata={'user_id': user.id}
    )
    user.stripe_customer_id = customer.id
    db.session.add(user)
    db.session.commit()
    return customer.id

def _get_user_for_session(session) -> User | None:
    user_id = session.get('metadata', {}).get('user_id')
    if user_id:
        return User.query.get(int(user_id))
    customer_id = session.get('customer')
    if customer_id:
        return User.query.filter_by(stripe_customer_id=customer_id).first()
    return None

def _upsert_customer_id(user: User, customer_id: str | None):
    if user and customer_id and not user.stripe_customer_id:
        user.stripe_customer_id = customer_id
        db.session.add(user)

@bp.route('/quote', methods=['POST'])
@login_required
def quote_points():
    data = request.get_json() or {}
    quote, error = quote_points_for_amount(data.get('amount_usd'))
    if error:
        return jsonify({'error': error}), 400
    return jsonify(quote), 200

@bp.route('/create-checkout-session', methods=['POST'])
@login_required
def create_checkout_session():
    data = request.get_json() or {}
    quote, error = quote_points_for_amount(data.get('amount_usd'))
    if error:
        return jsonify({'error': error}), 400
    amount_usd = Decimal(str(quote['amount_usd'])).quantize(Decimal('0.01'))
    amount_cents = int(amount_usd * 100)
    success_url, cancel_url = _get_frontend_urls()

    try:
        customer_id = _get_or_create_customer_id(current_user)

        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {'name': POINTS_PRODUCT_NAME},
                        'unit_amount': amount_cents
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': current_user.id,
                'points': quote['points'],
                'amount_usd': float(amount_usd)
            },
            payment_intent_data={
                'metadata': {
                    'user_id': current_user.id,
                    'points': quote['points'],
                    'amount_usd': float(amount_usd)
                }
            },
            client_reference_id=str(current_user.id)
        )
        return jsonify({'sessionId': checkout_session.id, 'points': quote['points']})

    except stripe.error.StripeError as e:
        logging.exception(f"[Stripe] Error creating checkout session: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        db.session.rollback()
        logging.exception(f"[Stripe] Error creating checkout session: {e}")
        return jsonify({'error': 'Failed to create checkout session'}), 500


def _amount_usd_from_cents(amount_cents: int) -> Decimal:
    return (Decimal(amount_cents) / Decimal('100')).quantize(Decimal('0.01'))

def _handle_checkout_session_completed(session):
    user = _get_user_for_session(session)
    if not user:
        logging.warning("[StripeWebhook] User not found for session.")
        return
    payment_intent_id = session.get('payment_intent')
    if not payment_intent_id:
        logging.warning("[StripeWebhook] Missing payment_intent in session.")
        return
    if Payment.query.filter_by(transaction_id=payment_intent_id).first():
        logging.info(f"[StripeWebhook] Payment already recorded: {payment_intent_id}")
        return
    amount_total = session.get('amount_total')
    if amount_total is None:
        logging.warning("[StripeWebhook] Missing amount_total in session.")
        return
    amount_usd = _amount_usd_from_cents(int(amount_total))
    details, error = calculate_points_for_amount(amount_usd)
    if error:
        logging.error(f"[StripeWebhook] Points calc failed: {error}")
        return
    payment = Payment(
        user_id=user.id,
        amount_usd=float(amount_usd),
        transaction_id=payment_intent_id,
        status='completed'
    )
    payment.amount_points = details['points']
    _upsert_customer_id(user, session.get('customer'))
    db.session.add(payment)
    db.session.commit()

def _handle_charge_refunded(charge):
    payment_intent_id = charge.get('payment_intent')
    if not payment_intent_id:
        logging.warning("[StripeWebhook] Refund missing payment_intent.")
        return
    payment = Payment.query.filter_by(transaction_id=payment_intent_id).first()
    if not payment:
        logging.warning(f"[StripeWebhook] Payment not found for refund: {payment_intent_id}")
        return
    amount = charge.get('amount')
    amount_refunded = charge.get('amount_refunded')
    if amount is None or amount_refunded is None:
        logging.warning("[StripeWebhook] Refund missing amounts.")
        return
    net_cents = max(int(amount) - int(amount_refunded), 0)
    if net_cents <= 0:
        payment.status = 'refunded'
        payment.amount_usd = Decimal('0.00')
        payment.amount_points = 0
    else:
        net_usd = _amount_usd_from_cents(net_cents)
        details, error = calculate_points_for_amount(net_usd)
        if error:
            logging.error(f"[StripeWebhook] Refund calc failed: {error}")
            return
        payment.amount_usd = float(net_usd)
        payment.amount_points = details['points']
        payment.status = 'completed'
    db.session.commit()

@bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')

    if not endpoint_secret:
        logging.error("[StripeWebhook] Secret not configured.")
        return jsonify(success=False), 500
    if not sig_header or not payload:
        logging.warning("[StripeWebhook] Missing signature or payload.")
        return jsonify(success=False), 400

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError as e:
        logging.warning(f"[StripeWebhook] Invalid payload: {e}")
        return jsonify(success=False), 400
    except stripe.error.SignatureVerificationError as e:
        logging.warning(f"[StripeWebhook] Invalid signature: {e}")
        return jsonify(success=False), 400

    event_type = event['type']
    if event_type == 'checkout.session.completed':
        _handle_checkout_session_completed(event['data']['object'])
    elif event_type == 'charge.refunded':
        _handle_charge_refunded(event['data']['object'])
    else:
        logging.info(f"[StripeWebhook] Ignored event: {event_type}")

    return jsonify(success=True)