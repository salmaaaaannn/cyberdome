from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import re

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+$")

def clean_email(v: str) -> str:
    cleaned = str(v).strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format.")
    return cleaned

def validate_password_complexity(v: str) -> str:
    if len(v) < 5:
        raise ValueError("Password must be at least 5 characters long.")
    digit_count = sum(c.isdigit() for c in v)
    if digit_count < 2:
        raise ValueError("Password must contain at least 2 numbers (0-9).")
    return v

class PersonalAccountSignup(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str
    phone: Optional[str] = None
    password: str = Field(..., min_length=5)
    confirm_password: str = Field(..., min_length=5)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return clean_email(v)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_complexity(v)

class CompanySignup(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=100)
    domain: Optional[str] = None
    admin_name: str = Field(..., min_length=2, max_length=100)
    work_email: str
    phone: Optional[str] = None
    password: str = Field(..., min_length=5)
    confirm_password: str = Field(..., min_length=5)
    access_code: Optional[str] = None

    @field_validator("domain", mode="before")
    @classmethod
    def check_domain(cls, v: Any) -> str:
        if not v or not str(v).strip():
            return "workspace.local"
        cleaned = str(v).strip().lower().replace(" ", "-")
        if len(cleaned) < 3:
            cleaned = f"{cleaned}-corp.local"
        return cleaned

    @field_validator("work_email")
    @classmethod
    def check_work_email(cls, v: str) -> str:
        return clean_email(v)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_complexity(v)

    @field_validator("access_code")
    @classmethod
    def check_access_code(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        code = v.strip().upper()
        if len(code) < 5:
            raise ValueError("Company access pass must be at least 5 characters long.")
        digit_count = sum(c.isdigit() for c in code)
        if digit_count < 2:
            raise ValueError("Company access pass must contain at least 2 numbers (e.g. SALMAN01).")
        return code

class CompanyJoinRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str
    password: str = Field(..., min_length=5)
    confirm_password: str = Field(..., min_length=5)
    company_code: str = Field(..., min_length=3)
    department: Optional[str] = "General"

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return clean_email(v)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_complexity(v)

class VerifyCodeRequest(BaseModel):
    company_code: str = Field(..., min_length=3)

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return clean_email(v)

class VerifyEmailRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return clean_email(v)

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

class MfaVerifyRequest(BaseModel):
    code: str

class UserProfileOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    account_type: str # 'USER' or 'COMPANY'
    role: str # 'ADMIN', 'EMPLOYEE', 'USER'
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    email_verified: bool
    mfa_enabled: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

class CompanyProfileOut(BaseModel):
    id: str
    company_name: str
    domain: str
    industry: Optional[str] = None
    size: Optional[str] = None
    security_contact: Optional[str] = None
    status: str
    created_at: datetime

class AuthResponseData(BaseModel):
    user: UserProfileOut
    company: Optional[CompanyProfileOut] = None
    role: str
    token: str
    redirect_url: str
    permissions: List[str]
