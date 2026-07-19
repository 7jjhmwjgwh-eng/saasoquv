from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.group import Group
from app.models.room import Room
from app.models.schedule import ScheduleSlot
from app.models.user import User

router = APIRouter(prefix="/api/schedule-overview", tags=["schedule-overview"])

WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]


@router.get("")
async def get_schedule_overview(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """The 'control room' view: every scheduled slot across the center — which room,
    what time, which course/level, who teaches, how many students, and free capacity.
    This is what powers the admin's 'какая комната когда занята, есть ли место' screen.
    """
    result = await db.execute(
        select(ScheduleSlot)
        .join(Group, Group.id == ScheduleSlot.group_id)
        .where(Group.tenant_id == user.tenant_id)
        .options(
            selectinload(ScheduleSlot.group).selectinload(Group.enrollments),
        )
        .order_by(ScheduleSlot.weekday, ScheduleSlot.start_time)
    )
    slots = result.scalars().all()

    room_result = await db.execute(select(Room).where(Room.tenant_id == user.tenant_id))
    rooms_by_id = {r.id: r for r in room_result.scalars().all()}

    overview = []
    for slot in slots:
        group = slot.group
        active_count = sum(1 for e in group.enrollments if e.status == EnrollmentStatus.ACTIVE)
        room = rooms_by_id.get(slot.room_id)
        overview.append(
            {
                "weekday": WEEKDAY_NAMES[slot.weekday],
                "start_time": str(slot.start_time),
                "end_time": str(slot.end_time),
                "room_name": room.name if room else "—",
                "room_capacity": room.capacity if room else None,
                "group_name": group.name,
                "teacher_id": str(group.teacher_id) if group.teacher_id else None,
                "enrolled_count": active_count,
                "free_slots": max(group.max_students - active_count, 0),
                "is_full": active_count >= group.max_students,
            }
        )
    return overview
