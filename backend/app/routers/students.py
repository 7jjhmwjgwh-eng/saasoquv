import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.attendance import Attendance
from app.models.homework import HomeworkSubmission
from app.models.lesson import Lesson
from app.models.points import StudentPointsLog
from app.models.student import Student
from app.models.user import User
from app.schemas.attendance import AttendanceOut
from app.schemas.homework import SubmissionOut
from app.schemas.student import StudentCreate, StudentOut, StudentUpdate

router = APIRouter(prefix="/api/students", tags=["students"])


async def _to_student_out(db: AsyncSession, student: Student) -> StudentOut:
    points_result = await db.execute(
        select(func.coalesce(func.sum(StudentPointsLog.points), 0)).where(
            StudentPointsLog.student_id == student.id
        )
    )
    out = StudentOut.model_validate(student)
    out.total_points = points_result.scalar_one()
    return out


@router.get("", response_model=list[StudentOut])
async def list_students(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Student).where(Student.tenant_id == user.tenant_id))
    students = result.scalars().all()
    return [await _to_student_out(db, s) for s in students]


@router.post("", response_model=StudentOut, status_code=201)
async def create_student(
    payload: StudentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    student = Student(
        tenant_id=user.tenant_id,
        full_name=payload.full_name,
        phone=payload.phone,
        source=payload.source,
        notes=payload.notes,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return await _to_student_out(db, student)


@router.patch("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.tenant_id == user.tenant_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    await db.commit()
    await db.refresh(student)
    return await _to_student_out(db, student)


@router.get("/by-telegram/{telegram_id}", response_model=StudentOut)
async def get_student_by_telegram(telegram_id: int, db: AsyncSession = Depends(get_db)):
    """Used by the Telegram bot to identify who is messaging it. No staff auth required —
    the bot itself is the client, and telegram_id is only ever set via an explicit link flow.
    """
    result = await db.execute(select(Student).where(Student.telegram_id == telegram_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="No student linked to this Telegram account")
    return await _to_student_out(db, student)


@router.post("/{student_id}/link-telegram", response_model=StudentOut)
async def link_telegram(
    student_id: uuid.UUID,
    telegram_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    """Staff links a student's Telegram account (e.g. admin enters the ID the bot reports
    after the student shares their contact/starts a linking conversation)."""
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.tenant_id == user.tenant_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.telegram_id = telegram_id
    await db.commit()
    await db.refresh(student)
    return await _to_student_out(db, student)


@router.get("/{student_id}/attendance", response_model=list[AttendanceOut])
async def get_student_attendance(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Full attendance history for one student — powers both the student portal and the bot."""
    result = await db.execute(
        select(Attendance)
        .where(Attendance.student_id == student_id)
        .options(selectinload(Attendance.lesson))
        .join(Lesson, Lesson.id == Attendance.lesson_id)
        .order_by(Lesson.date.desc())
    )
    records = result.scalars().all()
    out = []
    for record in records:
        item = AttendanceOut.model_validate(record)
        item.lesson_date = record.lesson.date if record.lesson else None
        out.append(item)
    return out


@router.get("/{student_id}/homework", response_model=list[SubmissionOut])
async def get_student_homework(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """A student's homework submissions with grades — 'что задано / что сдано / баллы'."""
    result = await db.execute(
        select(HomeworkSubmission)
        .where(HomeworkSubmission.student_id == student_id)
        .order_by(HomeworkSubmission.submitted_at.desc())
    )
    return result.scalars().all()


@router.get("/{student_id}/points-total")
async def get_student_points_total(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.coalesce(func.sum(StudentPointsLog.points), 0)).where(
            StudentPointsLog.student_id == student_id
        )
    )
    return {"student_id": str(student_id), "total_points": result.scalar_one()}
