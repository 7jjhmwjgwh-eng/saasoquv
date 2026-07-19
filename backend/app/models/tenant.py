from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Tenant(Base, UUIDMixin, TimestampMixin):
    """One учебный центр (customer) of the SaaS."""

    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subdomain: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(50), default="trial")  # trial / basic / pro
    is_active: Mapped[bool] = mapped_column(default=True)

    users: Mapped[list["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
