import uuid
from datetime import time

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import ScheduleSlot


def _times_overlap(start_a: time, end_a: time, start_b: time, end_b: time) -> bool:
    return start_a < end_b and start_b < end_a


async def find_room_conflict(
    db: AsyncSession,
    room_id: uuid.UUID,
    weekday: int,
    start_time: time,
    end_time: time,
    exclude_group_id: uuid.UUID | None = None,
) -> ScheduleSlot | None:
    """Returns the conflicting slot if this room is already booked at an overlapping time
    on the same weekday, otherwise None. Called before creating/updating a schedule slot
    so the admin sees 'room busy' instead of silently double-booking a classroom.
    """
    query = select(ScheduleSlot).where(
        ScheduleSlot.room_id == room_id,
        ScheduleSlot.weekday == weekday,
    )
    if exclude_group_id is not None:
        query = query.where(ScheduleSlot.group_id != exclude_group_id)

    result = await db.execute(query)
    for slot in result.scalars().all():
        if _times_overlap(start_time, end_time, slot.start_time, slot.end_time):
            return slot
    return None
