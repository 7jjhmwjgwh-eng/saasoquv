import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class StudentPointsLog(Base, UUIDMixin, TimestampMixin):
    """Append-only log of point changes (attendance streaks, homework grades, bonuses, etc).
    The student's total rating is SUM(points) — computed, not stored, so it's always consistent.
    """

    __tablename__ = "student_points_log"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False)  # can be negative
    reason: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "attendance", "homework:<id>"
