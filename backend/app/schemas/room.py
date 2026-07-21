import uuid

from pydantic import BaseModel


class RoomCreate(BaseModel):
    name: str
    capacity: int = 15


class RoomUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = None
    is_active: bool | None = None


class RoomOut(BaseModel):
    id: uuid.UUID
    name: str
    capacity: int
    is_active: bool

    class Config:
        from_attributes = True
