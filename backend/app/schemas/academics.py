import uuid
from datetime import time

from pydantic import BaseModel


class LevelOut(BaseModel):
    id: uuid.UUID
    name: str
    order_index: int

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    name: str
    description: str | None = None
    levels: list[str] = []  # convenience: create levels inline, e.g. ["Beginner", "Elementary"]


class CourseOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    levels: list[LevelOut] = []

    class Config:
        from_attributes = True


class ScheduleSlotCreate(BaseModel):
    room_id: uuid.UUID
    weekday: int  # 0=Monday .. 6=Sunday
    start_time: time
    end_time: time


class ScheduleSlotOut(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    weekday: int
    start_time: time
    end_time: time

    class Config:
        from_attributes = True


class GroupCreate(BaseModel):
    course_id: uuid.UUID
    level_id: uuid.UUID | None = None
    teacher_id: uuid.UUID | None = None
    name: str
    max_students: int = 12
    schedule_slots: list[ScheduleSlotCreate] = []


class GroupOut(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    level_id: uuid.UUID | None
    teacher_id: uuid.UUID | None
    name: str
    max_students: int
    status: str
    enrolled_count: int = 0
    free_slots: int = 0
    schedule_slots: list[ScheduleSlotOut] = []

    class Config:
        from_attributes = True
