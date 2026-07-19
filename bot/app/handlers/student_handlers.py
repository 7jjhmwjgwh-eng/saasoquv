from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup

from app.services.api_client import api_client

router = Router()

MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="📅 Посещаемость"), KeyboardButton(text="📚 Домашние задания")],
        [KeyboardButton(text="⭐ Мои баллы")],
    ],
    resize_keyboard=True,
)

CONTACT_KEYBOARD = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="📱 Отправить номер телефона", request_contact=True)]],
    resize_keyboard=True,
    one_time_keyboard=True,
)


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    student = await api_client.get_student_by_telegram_id(message.from_user.id)
    if student:
        await message.answer(
            f"С возвращением, {student['full_name']}! 👋\nВыбери, что показать:",
            reply_markup=MAIN_MENU,
        )
    else:
        await message.answer(
            "Привет! 👋 Я бот учебного центра.\n\n"
            "Чтобы получить доступ к своему кабинету (расписание, ДЗ, баллы), "
            "отправь свой номер телефона — администратор привяжет твой аккаунт.",
            reply_markup=CONTACT_KEYBOARD,
        )


@router.message(F.contact)
async def handle_contact(message: Message) -> None:
    # NOTE: actual linking is a two-step flow — the phone number here should be matched
    # against a Student record by an admin action (or an auto-match endpoint), since the
    # bot has no direct DB write access. For now we surface the Telegram ID so the admin
    # can complete the link via /api/students/{id}/link-telegram.
    await message.answer(
        f"Спасибо! Передал администратору твой номер {message.contact.phone_number}.\n"
        f"Твой Telegram ID: <code>{message.from_user.id}</code>\n\n"
        "Как только тебя привяжут к профилю, набери /start ещё раз."
    )


@router.message(F.text == "📅 Посещаемость")
async def show_attendance(message: Message) -> None:
    student = await api_client.get_student_by_telegram_id(message.from_user.id)
    if not student:
        await message.answer("Сначала нужно привязать аккаунт — набери /start")
        return

    records = await api_client.get_student_attendance(student["id"])
    if not records:
        await message.answer("Пока нет данных о посещаемости.")
        return

    lines = ["<b>Твоя посещаемость:</b>"]
    status_emoji = {"present": "✅", "absent": "❌", "late": "⏰", "excused": "🟡"}
    for rec in records[:15]:
        emoji = status_emoji.get(rec["status"], "•")
        date_str = rec.get("lesson_date", "—")
        lines.append(f"{emoji} {date_str} — {rec['status']} (+{rec['points_earned']} баллов)")

    await message.answer("\n".join(lines))


@router.message(F.text == "📚 Домашние задания")
async def show_homework(message: Message) -> None:
    student = await api_client.get_student_by_telegram_id(message.from_user.id)
    if not student:
        await message.answer("Сначала нужно привязать аккаунт — набери /start")
        return

    submissions = await api_client.get_student_homework(student["id"])
    if not submissions:
        await message.answer("Пока нет сданных домашних заданий.")
        return

    lines = ["<b>Твои домашние задания:</b>"]
    for sub in submissions[:15]:
        grade_str = f"{sub['grade']} баллов" if sub.get("grade") is not None else "не оценено"
        lines.append(f"• {grade_str}" + (f" — {sub['teacher_comment']}" if sub.get("teacher_comment") else ""))

    await message.answer("\n".join(lines))


@router.message(F.text == "⭐ Мои баллы")
async def show_points(message: Message) -> None:
    student = await api_client.get_student_by_telegram_id(message.from_user.id)
    if not student:
        await message.answer("Сначала нужно привязать аккаунт — набери /start")
        return

    await message.answer(f"⭐ У тебя <b>{student['total_points']}</b> баллов.")
