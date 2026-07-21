from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/edu_crm"

    # Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Telegram bot (used by bot service, kept here for shared config if needed)
    telegram_bot_token: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Super-admin (BotNest owner) — separate from tenant JWT auth
    super_admin_token: str = ""

    environment: str = "development"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Railway/Heroku-style Postgres plugins hand out `postgres://` or plain
        `postgresql://` URLs. SQLAlchemy's async engine needs the asyncpg driver
        explicitly, so we rewrite the scheme here rather than requiring every
        deployment target to know about this quirk.
        """
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
