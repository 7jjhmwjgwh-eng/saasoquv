import uuid

from sqlalchemy import ForeignKey, Integer, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class ScheduleSlot(Base, UUIDMixin, TimestampMixin):
    """Recurring weekly slot: this group meets in this room on this weekday at this time.

    weekday: 0=Monday ... 6=Sunday (ISO convention).
    Used both to render the timetable and to detect room double-booking.
    """

    __tablename__ = "schedule_slots"

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False, index=True)
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False, index=True)
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False)

    group: Mapped["Group"] = relationship(back_populates="schedule_slots")
