import uuid
from enum import Enum as PyEnum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class StudentStatus(str, PyEnum):
    LEAD = "lead"
    TRIAL = "trial"
    ACTIVE = "active"
    DROPPED = "dropped"


class Student(Base, UUIDMixin, TimestampMixin):
    """A learner. Separate from User (staff) — students log in via their own portal auth."""

    __tablename__ = "students"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    telegram_id: Mapped[int | None] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))  # for website login option
    status: Mapped[StudentStatus] = mapped_column(Enum(StudentStatus), default=StudentStatus.LEAD)
    source: Mapped[str | None] = mapped_column(String(100))  # e.g. "instagram", "referral"
    notes: Mapped[str | None] = mapped_column(String(2000))

    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
