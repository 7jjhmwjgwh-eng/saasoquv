import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.group import Group
from app.models.schedule import ScheduleSlot
from app.models.user import User
from app.schemas.academics import GroupCreate, GroupOut
from app.services.schedule_service import find_room_conflict

router = APIRouter(prefix="/api/groups", tags=["groups"])


async def _to_group_out(db: AsyncSession, group: Group) -> GroupOut:
    count_result = await db.execute(
        select(func.count(Enrollment.id)).where(
            Enrollment.group_id == group.id, Enrollment.status == EnrollmentStatus.ACTIVE
        )
    )
    enrolled_count = count_result.scalar_one()
    out = GroupOut.model_validate(group)
    out.enrolled_count = enrolled_count
    out.free_slots = max(group.max_students - enrolled_count, 0)
    return out


@router.get("", response_model=list[GroupOut])
async def list_groups(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group)
        .where(Group.tenant_id == user.tenant_id)
        .options(selectinload(Group.schedule_slots))
    )
    groups = result.scalars().all()
    return [await _to_group_out(db, g) for g in groups]


@router.post("", response_model=GroupOut, status_code=201)
async def create_group(
    payload: GroupCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    # Check every requested slot against existing bookings BEFORE creating anything,
    # so we never partially create a group with a conflicting room.
    for slot in payload.schedule_slots:
        conflict = await find_room_conflict(
            db, slot.room_id, slot.weekday, slot.start_time, slot.end_time
        )
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"Room is already booked on weekday {slot.weekday} "
                f"from {conflict.start_time} to {conflict.end_time}",
            )

    group = Group(
        tenant_id=user.tenant_id,
        course_id=payload.course_id,
        level_id=payload.level_id,
        teacher_id=payload.teacher_id,
        name=payload.name,
        max_students=payload.max_students,
    )
    db.add(group)
    await db.flush()

    for slot in payload.schedule_slots:
        db.add(
            ScheduleSlot(
                group_id=group.id,
                room_id=slot.room_id,
                weekday=slot.weekday,
                start_time=slot.start_time,
                end_time=slot.end_time,
            )
        )

    await db.commit()
    result = await db.execute(
        select(Group).where(Group.id == group.id).options(selectinload(Group.schedule_slots))
    )
    return await _to_group_out(db, result.scalar_one())


@router.post("/{group_id}/enroll", status_code=201)
async def enroll_student(
    group_id: uuid.UUID,
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    result = await db.execute(select(Group).where(Group.id == group_id, Group.tenant_id == user.tenant_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    count_result = await db.execute(
        select(func.count(Enrollment.id)).where(
            Enrollment.group_id == group_id, Enrollment.status == EnrollmentStatus.ACTIVE
        )
    )
    if count_result.scalar_one() >= group.max_students:
        raise HTTPException(status_code=409, detail="Group is full — no free slots")

    enrollment = Enrollment(student_id=student_id, group_id=group_id)
    db.add(enrollment)
    await db.commit()
    return {"status": "enrolled"}


@router.get("/{group_id}/students")
async def list_group_students(
    group_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    """Active roster for a group — this is what the teacher's attendance screen marks against."""
    from app.models.student import Student

    group_result = await db.execute(select(Group).where(Group.id == group_id, Group.tenant_id == user.tenant_id))
    if not group_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")

    result = await db.execute(
        select(Student.id, Student.full_name, Student.phone)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.group_id == group_id, Enrollment.status == EnrollmentStatus.ACTIVE)
        .order_by(Student.full_name)
    )
    return [{"id": str(row.id), "full_name": row.full_name, "phone": row.phone} for row in result.all()]
