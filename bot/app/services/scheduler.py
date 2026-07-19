import asyncio
import logging

from aiogram import Bot

from app.handlers.admin_handlers import _admin_tokens
from app.services.api_client import api_client

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 60 * 60 * 12  # twice a day


async def daily_payment_reminders(bot: Bot) -> None:
    """Loops forever, checking each linked admin's expiring payments and pushing a
    Telegram message if there are any. Runs as a background task alongside polling.
    """
    while True:
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        for telegram_id, token in list(_admin_tokens.items()):
            try:
                payments = await api_client.get_expiring_payments(token, within_days=3)
                if not payments:
                    continue
                lines = ["<b>⚠️ Автоотчёт: оплаты, истекающие в ближайшие 3 дня</b>"]
                for p in payments:
                    lines.append(f"• до {p['valid_until']} — {p['amount']}")
                await bot.send_message(telegram_id, "\n".join(lines))
            except Exception:
                logger.exception("Failed to send payment reminder to %s", telegram_id)
