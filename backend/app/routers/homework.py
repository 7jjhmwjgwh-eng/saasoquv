import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.homework import Homework, HomeworkSubmission
from app.models.points import StudentPointsLog
from app.models.user import User
from app.schemas.homework import HomeworkCreate, HomeworkOut, SubmissionCreate, SubmissionGrade, SubmissionOut

router = APIRouter(prefix="/api/homework", tags=["homework"])


@router.post("", response_model=HomeworkOut, status_code=201)
async def create_homework(
    payload: HomeworkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin", "teacher")),
):
    from app.models.enrollment import Enrollment, EnrollmentStatus
    from app.models.group import Group

    group_result = await db.execute(
        select(Group).where(Group.id == payload.group_id, Group.tenant_id == user.tenant_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user.role.value == "teacher" and group.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your group")

    homework = Homework(**payload.model_dump())
    db.add(homework)
    await db.flush()

    # Without a stub row per student, the student portal has nothing to show until
    # a submission exists — but there's no "submit" UI yet, so newly-assigned homework
    # would silently never appear. Creating a pending row per enrolled student fixes that.
    roster_result = await db.execute(
        select(Enrollment.student_id).where(
            Enrollment.group_id == payload.group_id, Enrollment.status == EnrollmentStatus.ACTIVE
        )
    )
    for (student_id,) in roster_result.all():
        db.add(HomeworkSubmission(homework_id=homework.id, student_id=student_id, is_completed=False))

    await db.commit()
    await db.refresh(homework)
    return homework


@router.get("/group/{group_id}", response_model=list[HomeworkOut])
async def list_homework_for_group(group_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Homework).where(Homework.group_id == group_id).order_by(Homework.due_date))
    return result.scalars().all()


@router.get("/{homework_id}/submissions", response_model=list[SubmissionOut])
async def list_submissions(homework_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(HomeworkSubmission)
        .where(HomeworkSubmission.homework_id == homework_id)
        .order_by(HomeworkSubmission.submitted_at.desc())
    )
    return result.scalars().all()


@router.post("/{homework_id}/submit", response_model=SubmissionOut, status_code=201)
async def submit_homework(
    homework_id: uuid.UUID,
    student_id: uuid.UUID,
    payload: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Student submits via portal or bot — no staff role required, just a valid student_id.
    In production this would be gated by student auth (see student portal auth), simplified here.
    """
    submission = HomeworkSubmission(
        homework_id=homework_id,
        student_id=student_id,
        text_answer=payload.text_answer,
        file_url=payload.file_url,
        submitted_at=datetime.now(timezone.utc),
        is_completed=True,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.post("/submissions/{submission_id}/grade", response_model=SubmissionOut)
async def grade_submission(
    submission_id: uuid.UUID,
    payload: SubmissionGrade,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin", "teacher")),
):
    result = await db.execute(select(HomeworkSubmission).where(HomeworkSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission.grade = payload.grade
    submission.teacher_comment = payload.teacher_comment
    submission.is_completed = True

    # Remove any points already logged for a previous grading of this same submission —
    # otherwise re-grading (fixing a mistake) doubles the student's points every time.
    existing_points = await db.execute(
        select(StudentPointsLog).where(StudentPointsLog.reason == f"homework:{submission.homework_id}:{submission.student_id}")
    )
    for p in existing_points.scalars().all():
        await db.delete(p)

    db.add(
        StudentPointsLog(
            student_id=submission.student_id,
            points=payload.grade,
            reason=f"homework:{submission.homework_id}:{submission.student_id}",
        )
    )
    await db.commit()
    await db.refresh(submission)
    return submission
