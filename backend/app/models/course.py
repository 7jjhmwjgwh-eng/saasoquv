import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Course(Base, UUIDMixin, TimestampMixin):
    """A subject/program offered by the center, e.g. 'English', 'Math for kids'."""

    __tablename__ = "courses"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))
    is_active: Mapped[bool] = mapped_column(default=True)

    levels: Mapped[list["Level"]] = relationship(back_populates="course", cascade="all, delete-orphan")


class Level(Base, UUIDMixin, TimestampMixin):
    """A level within a course, e.g. Beginner, Elementary, Pre-Intermediate. order_index controls sequence."""

    __tablename__ = "levels"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    course: Mapped["Course"] = relationship(back_populates="levels")
