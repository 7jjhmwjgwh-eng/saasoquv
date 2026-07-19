from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.course import Course, Level
from app.models.user import User
from app.schemas.academics import CourseCreate, CourseOut

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=list[CourseOut])
async def list_courses(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Course).where(Course.tenant_id == user.tenant_id).options(selectinload(Course.levels))
    )
    return result.scalars().all()


@router.post("", response_model=CourseOut, status_code=201)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    course = Course(tenant_id=user.tenant_id, name=payload.name, description=payload.description)
    db.add(course)
    await db.flush()

    for index, level_name in enumerate(payload.levels):
        db.add(Level(course_id=course.id, name=level_name, order_index=index))

    await db.commit()
    result = await db.execute(
        select(Course).where(Course.id == course.id).options(selectinload(Course.levels))
    )
    return result.scalar_one()
