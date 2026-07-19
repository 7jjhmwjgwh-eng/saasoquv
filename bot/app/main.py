import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from app.config import settings
from app.handlers import admin_handlers, student_handlers
from app.services.api_client import api_client
from app.services.scheduler import daily_payment_reminders

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(admin_handlers.router)
    dp.include_router(student_handlers.router)

    reminder_task = asyncio.create_task(daily_payment_reminders(bot))

    try:
        logger.info("Starting bot polling...")
        await dp.start_polling(bot)
    finally:
        reminder_task.cancel()
        await api_client.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
