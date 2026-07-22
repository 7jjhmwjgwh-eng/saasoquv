import uuid
from datetime import date

from pydantic import BaseModel


class StudentCreate(BaseModel):
    full_name: str
    phone: str | None = None
    parent_phone: str | None = None
    birth_date: date | None = None
    source: str | None = None
    notes: str | None = None


class StudentUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    parent_phone: str | None = None
    birth_date: date | None = None
    status: str | None = None
    notes: str | None = None


class StudentOut(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str | None
    parent_phone: str | None = None
    birth_date: date | None = None
    telegram_id: int | None
    status: str
    source: str | None
    total_points: int = 0

    # Denormalised "at a glance" fields the admin list needs — computed per request
    # rather than stored, so they can never drift from the underlying records.
    paid_until: date | None = None
    is_payment_overdue: bool = False
    lessons_total: int = 0
    lessons_missed: int = 0
    lessons_late: int = 0
    student_code: str | None = None

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    student_id: uuid.UUID
    group_id: uuid.UUID
