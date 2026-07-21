import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.room import Room
from app.models.user import User
from app.schemas.room import RoomCreate, RoomOut, RoomUpdate

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomOut])
async def list_rooms(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Room).where(Room.tenant_id == user.tenant_id, Room.is_active.is_(True)))
    return result.scalars().all()


@router.post("", response_model=RoomOut, status_code=201)
async def create_room(
    payload: RoomCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    room = Room(tenant_id=user.tenant_id, name=payload.name, capacity=payload.capacity)
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.patch("/{room_id}", response_model=RoomOut)
async def update_room(
    room_id: uuid.UUID,
    payload: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    result = await db.execute(select(Room).where(Room.id == room_id, Room.tenant_id == user.tenant_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    await db.commit()
    await db.refresh(room)
    return room
