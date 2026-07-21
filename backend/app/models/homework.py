import uuid
from datetime import date as date_type, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Homework(Base, UUIDMixin, TimestampMixin):
    """Assignment given to a whole group, optionally tied to a specific lesson."""

    __tablename__ = "homework"

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False, index=True)
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(3000))
    file_url: Mapped[str | None] = mapped_column(String(1000))
    due_date: Mapped[date_type | None] = mapped_column(Date)

    submissions: Mapped[list["HomeworkSubmission"]] = relationship(
        back_populates="homework", cascade="all, delete-orphan"
    )


class HomeworkSubmission(Base, UUIDMixin):
    """A student's submission + teacher's grade for one homework."""

    __tablename__ = "homework_submissions"

    homework_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("homework.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    file_url: Mapped[str | None] = mapped_column(String(1000))
    text_answer: Mapped[str | None] = mapped_column(String(3000))
    grade: Mapped[int | None] = mapped_column(Integer)  # e.g. 0-100
    teacher_comment: Mapped[str | None] = mapped_column(String(1000))
    is_completed: Mapped[bool] = mapped_column(default=False)

    homework: Mapped["Homework"] = relationship(back_populates="submissions")
