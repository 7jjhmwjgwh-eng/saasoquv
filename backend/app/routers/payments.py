from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.payment import Payment
from app.models.student import Student
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentOut

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("", response_model=PaymentOut, status_code=201)
async def create_payment(
    payload: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner", "admin")),
):
    payment = Payment(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.get("/student/{student_id}", response_model=list[PaymentOut])
async def list_payments_for_student(student_id, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Payment)
        .where(Payment.student_id == student_id, Payment.tenant_id == user.tenant_id)
        .order_by(Payment.paid_at.desc())
    )
    return result.scalars().all()


@router.get("/expiring", response_model=list[PaymentOut])
async def list_expiring_soon(
    within_days: int = 3,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Students whose paid period ends within N days — feeds the 'send payment reminder' report/bot job."""
    from datetime import timedelta

    cutoff = date.today() + timedelta(days=within_days)
    result = await db.execute(
        select(Payment)
        .where(
            Payment.tenant_id == user.tenant_id,
            Payment.valid_until.is_not(None),
            Payment.valid_until <= cutoff,
            Payment.valid_until >= date.today(),
        )
        .order_by(Payment.valid_until)
    )
    return result.scalars().all()
