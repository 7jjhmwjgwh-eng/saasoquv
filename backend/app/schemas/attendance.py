import uuid
from datetime import date

from pydantic import BaseModel


class LessonCreate(BaseModel):
    group_id: uuid.UUID
    room_id: uuid.UUID | None = None
    date: date
    topic: str | None = None


class AttendanceMark(BaseModel):
    student_id: uuid.UUID
    status: str  # present / absent / late / excused


class AttendanceBulkMark(BaseModel):
    lesson_id: uuid.UUID
    records: list[AttendanceMark]


class AttendanceOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    status: str
    points_earned: int
    lesson_date: date | None = None

    class Config:
        from_attributes = True


class LessonOut(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    room_id: uuid.UUID | None
    date: date
    topic: str | None
    is_cancelled: bool
    attendance_records: list[AttendanceOut] = []

    class Config:
        from_attributes = True
