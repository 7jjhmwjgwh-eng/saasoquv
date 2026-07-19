import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    student_id: uuid.UUID
    group_id: uuid.UUID | None = None
    amount: Decimal
    method: str = "cash"
    paid_at: date
    valid_until: date | None = None
    comment: str | None = None


class PaymentOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    amount: Decimal
    method: str
    status: str
    paid_at: date
    valid_until: date | None
    comment: str | None

    class Config:
        from_attributes = True
