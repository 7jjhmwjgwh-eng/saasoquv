import uuid
from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Lesson(Base, UUIDMixin, TimestampMixin):
    """A concrete lesson occurrence on a specific date, generated from a group's schedule_slots
    (or created manually for a one-off/makeup class).
    """

    __tablename__ = "lessons"

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False, index=True)
    room_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rooms.id"))
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    topic: Mapped[str | None] = mapped_column(String(500))
    is_cancelled: Mapped[bool] = mapped_column(default=False)

    attendance_records: Mapped[list["Attendance"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )
