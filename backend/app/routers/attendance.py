from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.attendance import Attendance, AttendanceStatus
from app.models.group import Group
from app.models.lesson import Lesson
from app.models.points import StudentPointsLog
from app.models.user import User
from app.schemas.attendance import AttendanceBulkMark, LessonCreate, LessonOut

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

# Points awarded per attendance status — simple, tweakable gamification rule.
POINTS_BY_STATUS = {
    AttendanceStatus.PRESENT: 10,
    AttendanceStatus.LATE: 5,
    AttendanceStatus.EXCUSED: 0,
    AttendanceStatus.ABSENT: 0,
}


@router.post("/lessons", response_model=LessonOut, status_code=201)
async def create_lesson(
    payload: LessonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin", "teacher")),
):
    group_result = await db.execute(
        select(Group).where(Group.id == payload.group_id, Group.tenant_id == user.tenant_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user.role.value == "teacher" and group.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your group")

    lesson = Lesson(
        group_id=payload.group_id, room_id=payload.room_id, date=payload.date, topic=payload.topic
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.post("/lessons/get-or-create", response_model=LessonOut)
async def get_or_create_lesson(
    payload: LessonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin", "teacher")),
):
    """Teacher opens the attendance screen for 'today' — this either finds today's lesson
    for the group or creates it, so the mobile UI doesn't need a separate 'create lesson'
    step before marking attendance.
    """
    group_result = await db.execute(
        select(Group).where(Group.id == payload.group_id, Group.tenant_id == user.tenant_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user.role.value == "teacher" and group.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your group")

    existing = await db.execute(
        select(Lesson)
        .where(Lesson.group_id == payload.group_id, Lesson.date == payload.date)
        .options(selectinload(Lesson.attendance_records))
    )
    lesson = existing.scalar_one_or_none()
    if lesson:
        return lesson

    lesson = Lesson(
        group_id=payload.group_id, room_id=payload.room_id, date=payload.date, topic=payload.topic
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    lesson.attendance_records = []
    return lesson


@router.post("/mark", status_code=200)
async def mark_attendance(
    payload: AttendanceBulkMark,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin", "teacher")),
):
    """Teacher marks attendance for a whole lesson in one call. Awards points automatically
    based on status, logged to student_points_log so the portal rating stays in sync.
    Re-marking the same lesson replaces prior records instead of duplicating them.
    """
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == payload.lesson_id).options(selectinload(Lesson.group))
    )
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if user.role.value == "teacher" and lesson.group.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your group")

    # Clear any existing attendance + points for this lesson first, so re-submitting
    # (e.g. teacher fixes a mistake) doesn't double-count points or duplicate rows.
    existing_result = await db.execute(select(Attendance).where(Attendance.lesson_id == payload.lesson_id))
    for existing in existing_result.scalars().all():
        await db.delete(existing)
    points_result = await db.execute(
        select(StudentPointsLog).where(StudentPointsLog.reason == f"attendance:{lesson.id}")
    )
    for existing_points in points_result.scalars().all():
        await db.delete(existing_points)
    await db.flush()

    for record in payload.records:
        status_enum = AttendanceStatus(record.status)
        points = POINTS_BY_STATUS.get(status_enum, 0)

        attendance = Attendance(
            lesson_id=payload.lesson_id,
            student_id=record.student_id,
            status=status_enum,
            points_earned=points,
        )
        db.add(attendance)

        if points:
            db.add(
                StudentPointsLog(
                    student_id=record.student_id,
                    points=points,
                    reason=f"attendance:{lesson.id}",
                )
            )

    await db.commit()
    return {"status": "marked", "count": len(payload.records)}


@router.get("/lessons/{group_id}", response_model=list[LessonOut])
async def list_lessons_for_group(
    group_id, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Lesson)
        .where(Lesson.group_id == group_id)
        .options(selectinload(Lesson.attendance_records))
        .order_by(Lesson.date.desc())
    )
    return result.scalars().all()
