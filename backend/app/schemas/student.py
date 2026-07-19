import uuid

from pydantic import BaseModel


class StudentCreate(BaseModel):
    full_name: str
    phone: str | None = None
    source: str | None = None
    notes: str | None = None


class StudentUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    status: str | None = None
    notes: str | None = None


class StudentOut(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str | None
    telegram_id: int | None
    status: str
    source: str | None
    total_points: int = 0

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    student_id: uuid.UUID
    group_id: uuid.UUID
