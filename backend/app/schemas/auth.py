import uuid

from pydantic import BaseModel, EmailStr


class TenantRegister(BaseModel):
    tenant_name: str
    subdomain: str
    owner_full_name: str
    owner_email: EmailStr
    owner_password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    subdomain: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    full_name: str
    email: str | None
    role: str

    class Config:
        from_attributes = True


class StudentSetPassword(BaseModel):
    """Admin sets an initial password for a student so they can log in on the website."""

    password: str


class StudentLoginRequest(BaseModel):
    subdomain: str
    phone: str
    password: str


class StudentTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_id: uuid.UUID
