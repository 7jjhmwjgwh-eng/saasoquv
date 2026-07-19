import uuid
from enum import Enum as PyEnum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class UserRole(str, PyEnum):
    OWNER = "owner"
    ADMIN = "admin"
    TEACHER = "teacher"


class User(Base, UUIDMixin, TimestampMixin):
    """Staff account: owner, admin, or teacher. Students are a separate model (see student.py)."""

    __tablename__ = "users"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    telegram_id: Mapped[int | None] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.TEACHER)
    is_active: Mapped[bool] = mapped_column(default=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
