from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class EmployeeOut(BaseModel):
    id: str # company_user id
    user_id: str
    company_id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str
    department: Optional[str] = None
    email_verified: bool
    mfa_enabled: bool
    last_login: Optional[datetime] = None
    created_at: datetime

class EmployeeRoleUpdate(BaseModel):
    role: str # 'ADMIN' or 'EMPLOYEE'
    department: Optional[str] = None

class EmployeeStatusUpdate(BaseModel):
    status: str # 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'
