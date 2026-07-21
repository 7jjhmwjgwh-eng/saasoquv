import uuid
from datetime import date as date_type
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class PaymentMethod(str, PyEnum):
    CASH = "cash"
    CARD = "card"
    CLICK = "click"
    PAYME = "payme"
    OTHER = "other"


class PaymentStatus(str, PyEnum):
    PAID = "paid"
    PARTIAL = "partial"
    REFUNDED = "refunded"


class Payment(Base, UUIDMixin, TimestampMixin):
    """A payment made by a student. valid_until drives the 'debt / subscription expiring' reports."""

    __tablename__ = "payments"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.CASH)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PAID)
    paid_at: Mapped[date_type] = mapped_column(Date, nullable=False)
    valid_until: Mapped[date_type | None] = mapped_column(Date)  # subscription/period end
    comment: Mapped[str | None] = mapped_column(String(500))
