import uuid
from datetime import date, datetime

from pydantic import BaseModel


class HomeworkCreate(BaseModel):
    group_id: uuid.UUID
    lesson_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    file_url: str | None = None
    due_date: date | None = None


class HomeworkOut(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    title: str
    description: str | None
    file_url: str | None
    due_date: date | None

    class Config:
        from_attributes = True


class SubmissionGrade(BaseModel):
    grade: int
    teacher_comment: str | None = None


class SubmissionCreate(BaseModel):
    """Student submits their own homework (via portal or bot)."""

    text_answer: str | None = None
    file_url: str | None = None


class SubmissionOut(BaseModel):
    id: uuid.UUID
    homework_id: uuid.UUID
    student_id: uuid.UUID
    submitted_at: datetime | None
    text_answer: str | None
    file_url: str | None
    grade: int | None
    teacher_comment: str | None
    is_completed: bool

    class Config:
        from_attributes = True
