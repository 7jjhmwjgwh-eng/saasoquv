import uuid
from enum import Enum as PyEnum

from sqlalchemy import Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class AttendanceStatus(str, PyEnum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class Attendance(Base, UUIDMixin, TimestampMixin):
    """One student's attendance record for one lesson. Marked by the teacher."""

    __tablename__ = "attendance"

    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)

    lesson: Mapped["Lesson"] = relationship(back_populates="attendance_records", lazy="joined")
