"""Staff management — create, list, update and deactivate employees (teachers/admins).
Only owners can create staff; admins can view the list but not change roles.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.auth import UserOut

router = APIRouter(prefix="/api/staff", tags=["staff"])


class StaffCreate(BaseModel):
    full_name: str
    phone: str | None = None
    email: EmailStr | None = None
    password: str
    role: str = "teacher"  # teacher | admin


class StaffUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None
    is_active: bool | None = None


@router.get("", response_model=list[UserOut])
async def list_staff(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(User.tenant_id == user.tenant_id).order_by(User.full_name)
    )
    return result.scalars().all()


@router.post("", response_model=UserOut, status_code=201)
async def create_staff(
    payload: StaffCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    try:
        role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    # An admin could otherwise create a peer admin or even an owner account through
    # this endpoint — only the owner is allowed to hand out admin/owner privileges.
    if user.role != UserRole.OWNER and role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only the director can create admin accounts")

    if payload.email:
        existing = await db.execute(
            select(User).where(User.email == payload.email, User.tenant_id == user.tenant_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already used in this centre")

    staff = User(
        tenant_id=user.tenant_id,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
    )
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return staff


@router.patch("/{staff_id}", response_model=UserOut)
async def update_staff(
    staff_id: uuid.UUID,
    payload: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner")),
):
    result = await db.execute(
        select(User).where(User.id == staff_id, User.tenant_id == user.tenant_id)
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "role" and value is not None:
            value = UserRole(value)
        setattr(staff, field, value)
    await db.commit()
    await db.refresh(staff)
    return staff
