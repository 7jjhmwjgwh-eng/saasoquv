from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

from app.services.api_client import api_client

router = Router()

# In-memory token cache: telegram_id -> access_token. Simple and good enough for a single
# bot process; if the bot ever scales to multiple workers, move this to Redis.
_admin_tokens: dict[int, str] = {}


class LinkAdmin(StatesGroup):
    waiting_email = State()
    waiting_subdomain = State()
    waiting_password = State()


@router.message(Command("admin_login"))
async def start_admin_login(message: Message, state: FSMContext) -> None:
    await state.set_state(LinkAdmin.waiting_email)
    await message.answer("Введи email администратора (тот, что использовался при регистрации центра):")


@router.message(LinkAdmin.waiting_email)
async def get_email(message: Message, state: FSMContext) -> None:
    await state.update_data(email=message.text.strip())
    await state.set_state(LinkAdmin.waiting_subdomain)
    await message.answer("Теперь введи subdomain твоего центра (тот, что задавал при регистрации):")


@router.message(LinkAdmin.waiting_subdomain)
async def get_subdomain(message: Message, state: FSMContext) -> None:
    await state.update_data(subdomain=message.text.strip())
    await state.set_state(LinkAdmin.waiting_password)
    await message.answer("И пароль (сообщение с паролем будет удалено сразу после проверки):")


@router.message(LinkAdmin.waiting_password)
async def get_password(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    password = message.text
    try:
        await message.delete()  # don't leave the password sitting in chat history
    except Exception:
        pass

    try:
        token = await api_client.login(email=data["email"], subdomain=data["subdomain"], password=password)
        await api_client.link_admin_telegram(
            email=data["email"],
            subdomain=data["subdomain"],
            password=password,
            telegram_id=message.from_user.id,
        )
        _admin_tokens[message.from_user.id] = token
        await message.answer(
            "✅ Готово! Аккаунт привязан. Теперь доступны команды:\n"
            "/report_payments — кто скоро должен платить\n"
            "/schedule_today — сегодняшнее расписание с загрузкой аудиторий"
        )
    except Exception:
        await message.answer("❌ Не удалось войти — проверь email/subdomain/пароль и попробуй /admin_login снова.")
    finally:
        await state.clear()


async def _get_token(telegram_id: int) -> str | None:
    if telegram_id in _admin_tokens:
        return _admin_tokens[telegram_id]
    admin = await api_client.get_admin_by_telegram_id(telegram_id)
    return None if not admin else _admin_tokens.get(telegram_id)


@router.message(Command("report_payments"))
async def report_expiring_payments(message: Message) -> None:
    token = await _get_token(message.from_user.id)
    if not token:
        await message.answer("Сначала войди: /admin_login")
        return

    payments = await api_client.get_expiring_payments(token, within_days=3)
    if not payments:
        await message.answer("🎉 Нет оплат, истекающих в ближайшие 3 дня.")
        return

    lines = ["<b>⚠️ Оплаты, истекающие в ближайшие 3 дня:</b>"]
    for p in payments:
        lines.append(f"• до {p['valid_until']} — {p['amount']} (студент {p['student_id'][:8]}...)")
    await message.answer("\n".join(lines))


@router.message(Command("schedule_today"))
async def schedule_today(message: Message) -> None:
    token = await _get_token(message.from_user.id)
    if not token:
        await message.answer("Сначала войди: /admin_login")
        return

    overview = await api_client.get_schedule_overview(token)
    if not overview:
        await message.answer("Расписание пока пустое.")
        return

    lines = ["<b>📋 Расписание и загрузка аудиторий:</b>"]
    for slot in overview:
        full_mark = "🔴 ПОЛНАЯ" if slot["is_full"] else f"🟢 {slot['free_slots']} мест свободно"
        lines.append(
            f"{slot['weekday']} {slot['start_time']}-{slot['end_time']} | "
            f"{slot['room_name']} | {slot['group_name']} | {full_mark}"
        )
    await message.answer("\n".join(lines))
