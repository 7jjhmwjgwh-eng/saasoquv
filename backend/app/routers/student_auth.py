import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_student, require_role
from app.core.security import create_access_token, hash_password, verify_password
from app.models.points import StudentPointsLog
from app.models.student import Student
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import StudentLoginRequest, StudentSetPassword, StudentTokenResponse
from app.schemas.student import StudentOut

router = APIRouter(prefix="/api/student-auth", tags=["student-auth"])


@router.post("/login", response_model=StudentTokenResponse)
async def student_login(payload: StudentLoginRequest, db: AsyncSession = Depends(get_db)):
    """Students log in with phone + password (set by an admin) scoped to their center's
    subdomain — same subdomain concept as staff login, separate credential space.
    """
    result = await db.execute(
        select(Student)
        .join(Tenant, Tenant.id == Student.tenant_id)
        .where(Student.phone == payload.phone, Tenant.subdomain == payload.subdomain)
    )
    student = result.scalar_one_or_none()
    if not student or not student.password_hash or not verify_password(payload.password, student.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"student_id": str(student.id)})
    return StudentTokenResponse(access_token=token, student_id=student.id)


@router.get("/me", response_model=StudentOut)
async def get_my_profile(db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    """The student portal's entry point — resolves the logged-in student from their own token,
    so the frontend never needs to know or pass a student_id explicitly. Reuses the same
    builder as the admin-facing student list so the code/points/payment fields never drift
    between what staff see and what the student sees about themselves.
    """
    from app.routers.students import _to_student_out

    return await _to_student_out(db, student)


@router.post("/students/{student_id}/set-password")
async def set_student_password(
    student_id: uuid.UUID,
    payload: StudentSetPassword,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    """Admin sets/resets a student's portal password (e.g. when enrolling them)."""
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.tenant_id == user.tenant_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.password_hash = hash_password(payload.password)
    await db.commit()
    return {"status": "password set"}


@router.get("/me/attendance")
async def get_my_attendance(db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    from sqlalchemy.orm import selectinload

    from app.models.attendance import Attendance
    from app.models.lesson import Lesson
    from app.schemas.attendance import AttendanceOut

    result = await db.execute(
        select(Attendance)
        .where(Attendance.student_id == student.id)
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


@router.get("/me/homework")
async def get_my_homework(db: AsyncSession = Depends(get_db), student: Student = Depends(get_current_student)):
    from app.models.homework import HomeworkSubmission
    from app.schemas.homework import SubmissionOut

    result = await db.execute(
        select(HomeworkSubmission)
        .where(HomeworkSubmission.student_id == student.id)
        .order_by(HomeworkSubmission.submitted_at.desc())
    )
    return [SubmissionOut.model_validate(s) for s in result.scalars().all()]
