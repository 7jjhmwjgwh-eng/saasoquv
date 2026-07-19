import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.student import Student
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
student_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/student-auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decodes the JWT and loads the User. The token's tenant_id becomes the scope
    for every query the request makes — this is the core of tenant isolation.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None or "user_id" not in payload:
        raise credentials_exception

    user_id = uuid.UUID(payload["user_id"])
    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


def require_role(*roles: str):
    """Usage: Depends(require_role('owner', 'admin')) to restrict an endpoint."""

    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker


async def get_current_student(
    token: str = Depends(student_oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Student:
    """Separate auth track from staff users — a student token only ever carries
    student_id, so it can never be replayed against staff-only endpoints.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate student credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    payload = decode_access_token(token)
    if payload is None or "student_id" not in payload:
        raise credentials_exception

    student_id = uuid.UUID(payload["student_id"])
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if student is None:
        raise credentials_exception
    return student
