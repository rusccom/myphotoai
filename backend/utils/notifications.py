import requests
import logging
import os
from flask import current_app

def send_telegram_message(message: str):
    """Отправляет сообщение в Telegram чат, указанный в конфигурации."""
    
    bot_token = current_app.config.get('TELEGRAM_BOT_TOKEN')
    chat_id = current_app.config.get('TELEGRAM_CHAT_ID')

    if not bot_token or not chat_id:
        logging.error("Telegram bot token or chat ID is not configured.")
        return False

    api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'Markdown' # Или 'HTML', если предпочитаете
    }

    try:
        response = requests.post(api_url, data=payload, timeout=10) # Таймаут 10 секунд
        response.raise_for_status() # Вызовет исключение для HTTP ошибок (4xx, 5xx)
        logging.info(f"Successfully sent Telegram message to chat {chat_id}")
        return True
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to send Telegram message: {e}")
        # Здесь можно добавить более детальную обработку ошибок, например, повторные попытки
        return False
    except Exception as e:
        logging.error(f"An unexpected error occurred while sending Telegram message: {e}")
        return False

# Создаем папку utils, если её нет
if not os.path.exists(os.path.dirname(__file__)):
     try:
         os.makedirs(os.path.dirname(__file__))
     except OSError as exc: # Обработка гонки потоков
         if exc.errno != errno.EEXIST:
             raise 