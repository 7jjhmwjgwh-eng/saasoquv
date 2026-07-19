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
    homework = Homework(**payload.model_dump())
    db.add(homework)
    await db.commit()
    await db.refresh(homework)
    return homework


@router.get("/group/{group_id}", response_model=list[HomeworkOut])
async def list_homework_for_group(group_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Homework).where(Homework.group_id == group_id).order_by(Homework.due_date))
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

    # Grade feeds into the same points log as attendance, so the portal rating is one number.
    db.add(
        StudentPointsLog(
            student_id=submission.student_id,
            points=payload.grade,
            reason=f"homework:{submission.homework_id}",
        )
    )
    await db.commit()
    await db.refresh(submission)
    return submission
