from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TenantRegister, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginResponse(TokenResponse):
    role: str
    full_name: str


@router.post("/register", response_model=TokenResponse)
async def register_tenant(payload: TenantRegister, db: AsyncSession = Depends(get_db)):
    """Creates a new учебный центр (tenant) plus its first owner user. Self-serve signup entry point."""
    existing = await db.execute(select(Tenant).where(Tenant.subdomain == payload.subdomain))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Subdomain already taken")

    tenant = Tenant(name=payload.tenant_name, subdomain=payload.subdomain)
    db.add(tenant)
    await db.flush()  # get tenant.id before creating the user

    owner = User(
        tenant_id=tenant.id,
        full_name=payload.owner_full_name,
        email=payload.owner_email,
        password_hash=hash_password(payload.owner_password),
        role=UserRole.OWNER,
    )
    db.add(owner)
    await db.commit()

    token = create_access_token({"user_id": str(owner.id), "tenant_id": str(tenant.id)})
    return TokenResponse(access_token=token)


@router.get("/by-telegram/{telegram_id}", response_model=UserOut)
async def get_admin_by_telegram(telegram_id: int, db: AsyncSession = Depends(get_db)):
    """Bot calls this to resolve which tenant/user is messaging it, so admin commands
    (like /report_payments) know which tenant to scope the report to."""
    result = await db.execute(select(User).where(User.telegram_id == telegram_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No admin linked to this Telegram account")
    return user


@router.post("/link-telegram")
async def link_admin_telegram(
    email: str,
    subdomain: str,
    telegram_id: int,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Lets an admin/owner link their Telegram account by proving they know their password
    (called from the bot after they DM it their email/subdomain — not a web-form flow).
    Once linked, the bot can push payment/report notifications to them via telegram_id.
    """
    result = await db.execute(
        select(User)
        .join(Tenant, Tenant.id == User.tenant_id)
        .where(User.email == email, Tenant.subdomain == subdomain)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.telegram_id = telegram_id
    await db.commit()
    return {"status": "linked", "tenant_id": str(user.tenant_id)}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    """Current logged-in user — frontend calls this on startup to decide which panel to show."""
    return user


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .join(Tenant, Tenant.id == User.tenant_id)
        .where(User.email == payload.email, Tenant.subdomain == payload.subdomain)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    token = create_access_token({"user_id": str(user.id), "tenant_id": str(user.tenant_id)})
    # Return role so the frontend can immediately redirect to the right panel
    # without a second round-trip to /me.
    return {"access_token": token, "token_type": "bearer", "role": user.role.value, "full_name": user.full_name}
