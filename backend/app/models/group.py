import uuid
from enum import Enum as PyEnum

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class GroupStatus(str, PyEnum):
    ACTIVE = "active"
    FINISHED = "finished"
    PAUSED = "paused"


class Group(Base, UUIDMixin, TimestampMixin):
    """A cohort of students learning a course at a specific level with a specific teacher."""

    __tablename__ = "groups"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    level_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("levels.id"))
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "English Elementary - Mon/Wed 18:00"
    max_students: Mapped[int] = mapped_column(Integer, default=12)
    status: Mapped[GroupStatus] = mapped_column(Enum(GroupStatus), default=GroupStatus.ACTIVE)

    schedule_slots: Mapped[list["ScheduleSlot"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )
