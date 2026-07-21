from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.payment import Payment
from app.models.student import Student, StudentStatus
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentOut

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
async def list_all_payments(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    """Every payment in the centre, newest first — the admin's cash journal."""
    result = await db.execute(
        select(Payment).where(Payment.tenant_id == user.tenant_id).order_by(Payment.paid_at.desc())
    )
    return result.scalars().all()


@router.get("/debtors")
async def list_debtors(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Students whose paid period has already ended (or who never paid at all).
    This is the 'кто должен' screen — the single most asked question by a centre owner.
    """
    today = date.today()
    paid_until_sq = (
        select(Payment.student_id, func.max(Payment.valid_until).label("paid_until"))
        .where(Payment.tenant_id == user.tenant_id)
        .group_by(Payment.student_id)
        .subquery()
    )
    result = await db.execute(
        select(Student.id, Student.full_name, Student.phone, paid_until_sq.c.paid_until)
        .outerjoin(paid_until_sq, paid_until_sq.c.student_id == Student.id)
        .where(Student.tenant_id == user.tenant_id, Student.status == StudentStatus.ACTIVE)
        .order_by(paid_until_sq.c.paid_until.nullsfirst())
    )
    debtors = []
    for row in result.all():
        if row.paid_until is None or row.paid_until < today:
            debtors.append(
                {
                    "student_id": str(row.id),
                    "full_name": row.full_name,
                    "phone": row.phone,
                    "paid_until": row.paid_until.isoformat() if row.paid_until else None,
                    "days_overdue": (today - row.paid_until).days if row.paid_until else None,
                }
            )
    return debtors


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
