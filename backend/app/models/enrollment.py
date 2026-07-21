import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import UUIDMixin


class EnrollmentStatus(str, PyEnum):
    ACTIVE = "active"
    FINISHED = "finished"
    DROPPED = "dropped"


class Enrollment(Base, UUIDMixin):
    """Links a student to a group. A student can have multiple enrollments over time
    (e.g. moved from one group/level to another) — history is preserved, not overwritten.
    """

    __tablename__ = "enrollments"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False, index=True)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[EnrollmentStatus] = mapped_column(Enum(EnrollmentStatus), default=EnrollmentStatus.ACTIVE)

    student: Mapped["Student"] = relationship(back_populates="enrollments")
    group: Mapped["Group"] = relationship(back_populates="enrollments")
