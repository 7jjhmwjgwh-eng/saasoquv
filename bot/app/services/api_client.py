import httpx

from app.config import settings


class ApiClient:
    """Thin wrapper around the backend REST API. The bot never talks to the DB directly —
    it always goes through the same API the web frontend uses, so business rules
    (capacity checks, tenant isolation, points logic) live in one place.
    """

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(base_url=settings.api_base_url, timeout=10.0)

    async def get_student_by_telegram_id(self, telegram_id: int) -> dict | None:
        resp = await self._client.get(f"/api/students/by-telegram/{telegram_id}")
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    async def get_student_attendance(self, student_id: str) -> list[dict]:
        resp = await self._client.get(f"/api/students/{student_id}/attendance")
        resp.raise_for_status()
        return resp.json()

    async def get_student_homework(self, student_id: str) -> list[dict]:
        resp = await self._client.get(f"/api/students/{student_id}/homework")
        resp.raise_for_status()
        return resp.json()

    async def get_admin_by_telegram_id(self, telegram_id: int) -> dict | None:
        resp = await self._client.get(f"/api/auth/by-telegram/{telegram_id}")
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    async def link_admin_telegram(self, email: str, subdomain: str, password: str, telegram_id: int) -> dict:
        resp = await self._client.post(
            "/api/auth/link-telegram",
            params={"email": email, "subdomain": subdomain, "password": password, "telegram_id": telegram_id},
        )
        resp.raise_for_status()
        return resp.json()

    async def login(self, email: str, subdomain: str, password: str) -> str:
        resp = await self._client.post(
            "/api/auth/login", json={"email": email, "subdomain": subdomain, "password": password}
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    async def get_expiring_payments(self, access_token: str, within_days: int = 3) -> list[dict]:
        resp = await self._client.get(
            "/api/payments/expiring",
            params={"within_days": within_days},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_schedule_overview(self, access_token: str) -> list[dict]:
        resp = await self._client.get(
            "/api/schedule-overview", headers={"Authorization": f"Bearer {access_token}"}
        )
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        await self._client.aclose()


api_client = ApiClient()
