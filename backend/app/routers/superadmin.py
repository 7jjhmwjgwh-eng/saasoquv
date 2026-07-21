"""Super-admin routes — visible only to the product owner (BotNest / Jasur).
Protected by a separate SUPER_ADMIN_TOKEN env variable, not the regular JWT,
so even an 'owner' role inside a tenant can't access this.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.payment import Payment
from app.models.student import Student, StudentStatus
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter(prefix="/api/superadmin", tags=["superadmin"])


def _check_token(x_super_token: str | None = Header(default=None)):
    if not settings.super_admin_token:
        raise HTTPException(status_code=503, detail="Superadmin not configured")
    if x_super_token != settings.super_admin_token:
        raise HTTPException(status_code=403, detail="Invalid superadmin token")


@router.get("/tenants")
async def list_tenants(
    db: AsyncSession = Depends(get_db), _: None = Depends(_check_token)
):
    """All centres in the system — the owner's 'who are my clients' screen."""
    result = await db.execute(
        select(Tenant).order_by(Tenant.created_at.desc())
    )
    tenants = result.scalars().all()

    rows = []
    for t in tenants:
        # Active student count
        stu = await db.execute(
            select(func.count(Student.id)).where(
                Student.tenant_id == t.id,
                Student.status == StudentStatus.ACTIVE,
            )
        )
        # Revenue this month
        today = date.today()
        rev = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.tenant_id == t.id,
                func.date_trunc("month", Payment.paid_at) == func.date_trunc("month", func.current_date()),
            )
        )
        # Owner email
        owner = await db.execute(
            select(User).where(User.tenant_id == t.id, User.role == "owner")
        )
        owner_user = owner.scalars().first()

        rows.append({
            "id": str(t.id),
            "name": t.name,
            "subdomain": t.subdomain,
            "plan": t.plan,
            "is_active": t.is_active,
            "created_at": t.created_at.date().isoformat(),
            "owner_email": owner_user.email if owner_user else None,
            "active_students": stu.scalar_one(),
            "revenue_this_month": float(rev.scalar_one()),
        })
    return rows


@router.patch("/tenants/{tenant_id}/toggle")
async def toggle_tenant(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_check_token),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.is_active = not tenant.is_active
    await db.commit()
    return {"id": str(tenant.id), "is_active": tenant.is_active}


@router.patch("/tenants/{tenant_id}/plan")
async def set_plan(
    tenant_id: uuid.UUID,
    plan: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_check_token),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.plan = plan
    await db.commit()
    return {"id": str(tenant.id), "plan": tenant.plan}
