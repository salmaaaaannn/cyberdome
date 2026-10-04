from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class CompanyProfileOut(BaseModel):
    id: str
    company_name: str
    domain: str
    industry: Optional[str] = None
    size: Optional[str] = None
    security_contact: Optional[str] = None
    status: str
    created_at: datetime

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    security_contact: Optional[str] = None

import re

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+$")

def clean_email(v: str) -> str:
    cleaned = str(v).strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format.")
    return cleaned

class InvitationCreate(BaseModel):
    email: str
    name: Optional[str] = None
    role: str = "EMPLOYEE" # 'ADMIN' or 'EMPLOYEE'
    department: Optional[str] = "General"

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return clean_email(v)

class InvitationOut(BaseModel):
    id: str
    company_id: str
    email: str
    role: str
    token: str
    department: Optional[str] = None
    status: str
    expires_at: datetime
    created_at: datetime

class InvitationAccept(BaseModel):
    token: str
    name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

class CompanyOverviewOut(BaseModel):
    company_id: str
    company_name: str
    domain: str
    total_employees: int
    total_assets: int
    active_incidents: int
    security_score: int
    status: str
