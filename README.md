# EduCRM — SaaS для учебных центров

CRM/ERP-система для учебных центров (курсов): группы, расписание с проверкой занятости
аудиторий, посещаемость, домашние задания с баллами, оплаты, личный кабинет ученика
(сайт + Telegram-бот), уведомления администратору. Мультитенантная — одна установка
обслуживает много учебных центров.

## Структура

```
backend/    FastAPI + PostgreSQL — основное API (36 эндпоинтов)
bot/        Telegram-бот (aiogram 3) — кабинет ученика + уведомления админу
frontend/   Next.js — веб-панель администратора + кабинет ученика (/portal)
```

## Локальный запуск (Docker Compose)

1. Скопируй `.env.example` → `.env` в `backend/` и `bot/`:
   - `backend/.env`: придумай `SECRET_KEY` (любая случайная строка)
   - `bot/.env`: `TELEGRAM_BOT_TOKEN` от [@BotFather](https://t.me/BotFather)

2. Запусти всё:
   ```bash
   docker compose up --build
   ```
   Backend — `http://localhost:8000` (миграции применяются автоматически при старте),
   фронтенд — `http://localhost:3000`, бот подключается к Telegram сам.

3. `http://localhost:8000/docs` — Swagger со всем API, можно тестировать запросы прямо там.

## Первый запуск / создание центра

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_name": "Мой учебный центр",
    "subdomain": "my-center",
    "owner_full_name": "Жасур",
    "owner_email": "owner@example.com",
    "owner_password": "supersecret"
  }'
```

Дальше заходи на `http://localhost:3000/login` с этими email/subdomain/паролем.
Ученики входят на `/portal/login` по номеру телефона и паролю, который им выдаёт
администратор со страницы "Ученики" (кнопка "Выдать пароль").

---

## Деплой на Railway

Три отдельных сервиса (backend, bot, frontend) + один managed Postgres — все в одном
Railway-проекте, чтобы они видели друг друга по внутренней сети.

### 1. Создай проект и Postgres

В Railway: **New Project** → **Provision PostgreSQL**. Railway сам создаст переменную
`DATABASE_URL` — она будет доступна остальным сервисам через reference.

### 2. Backend

**New Service → Deploy from GitHub repo** (или `railway up` из папки `backend/` через CLI),
укажи root directory `/backend` — там уже лежит `railway.json`, Railway подхватит
Dockerfile и `startCommand` (миграции + uvicorn) автоматически.

Переменные окружения сервиса:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}   # reference на Postgres-сервис
SECRET_KEY=<сгенерируй случайную строку>
CORS_ORIGINS=["https://<твой-frontend-домен>.up.railway.app"]
ENVIRONMENT=production
```
Backend сам конвертирует `postgres://`/`postgresql://` от Railway в нужный
asyncpg-формат — ничего дополнительно делать не нужно.

Включи **публичный домен** для backend (Settings → Networking → Generate Domain) —
он понадобится фронту и боту.

**Файлы для ДЗ (uploads):** у Railway нет персистентного диска по умолчанию — добавь
**Volume** сервису backend, mount path `/app/uploads`. Без этого загруженные файлы
пропадут при каждом передеплое.

### 3. Frontend

**New Service** с root directory `/frontend`. `railway.json` там уже указывает на
`Dockerfile.production` (multi-stage сборка, standalone-режим Next.js).

Важно: `NEXT_PUBLIC_API_URL` — это build-time переменная (Next.js встраивает её в JS
при сборке, не читает во время работы). В Railway задай её как **build argument**:
Settings → Build → Variables (не обычные runtime-переменные) со значением публичного
домена backend, например `https://backend-production-xxxx.up.railway.app`.

Включи публичный домен и для frontend.

### 4. Bot

**New Service** с root directory `/bot`. Это background worker без HTTP — Railway
не будет проверять его через health-check по умолчанию, что и нужно (polling-бот
не слушает порт).

Переменные:
```
TELEGRAM_BOT_TOKEN=<токен от BotFather>
API_BASE_URL=${{backend.RAILWAY_PRIVATE_DOMAIN}}   # внутренний адрес backend-сервиса
```
Используй именно приватный домен backend (Railway даёт его автоматически всем сервисам
одного проекта) — так трафик бот→backend не выходит в интернет и работает быстрее.

### 5. Первая миграция и первый центр

Миграции применяются автоматически при каждом деплое backend (`alembic upgrade head`
зашит в startCommand). После первого успешного деплоя создай первый учебный центр —
тем же `curl`, что и локально, только на публичный домен backend вместо localhost.

### Обновления

Просто пуш в ветку, привязанную к Railway-сервису — передеплой автоматический для
всех трёх сервисов независимо.

---

## Что уже работает

- Мультитенантность: каждый учебный центр изолирован по `tenant_id`
- Группы с расписанием — система не даст занять одну аудиторию дважды в одно время
- Учёт свободных мест в группе и в расписании (видно в UI зелёным/жёлтым/красным)
- Посещаемость с автоначислением баллов ученику
- **Экран отметки посещаемости для учителя** (`/attendance`) — выбрал группу, система сама
  подставила сегодняшний урок, отметил каждого ученика в один тап, сохранил
- Домашние задания: выдача, сдача, оценка, файлы-вложения — тоже начисляет баллы
- Оплаты с датой и сроком действия + отчёт "у кого истекает абонемент"
- UI для курсов/уровней/аудиторий (`/courses`, `/rooms`) — не только через API
- Личный кабинет ученика на сайте (`/portal`) — отдельный логин по телефону+паролю,
  плюс тот же функционал через Telegram-бота
- Telegram-бот: ученик видит своё расписание/ДЗ/баллы, админ получает авто-отчёты
  по оплатам раз в 12 часов и по команде `/report_payments`, `/schedule_today`
- Production-сборка фронтенда (standalone Next.js) и конфиги для деплоя на Railway
- **Полная мобильная адаптация**: нижняя таб-бар и выдвижное меню на телефоне вместо
  desktop-сайдбара, расписание превращается в карточки вместо тесной таблицы,
  крупные тап-зоны в отметке посещаемости, липкая кнопка "Сохранить" всегда под рукой

## Что стоит доделать дальше

- Расчёт зарплаты преподавателя по факту проведённых занятий
- UI для загрузки файлов ДЗ прямо со страницы группы (эндпоинты `/api/uploads/*`
  уже готовы, кнопка загрузки в интерфейсе — нет)
- Email-уведомления как альтернатива Telegram для центров, где не все пользуются ботом
