from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "SECURITY" # 'ALERT', 'SECURITY', 'SYSTEM', 'TRAINING'
    severity: str = "INFO" # 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    channel: str = "WEB"

class NotificationOut(BaseModel):
    id: str
    user_id: str
    company_id: Optional[str] = None
    type: str
    severity: str
    title: str
    message: str
    channel: str
    status: str
    read_at: Optional[datetime] = None
    created_at: datetime

class NotificationPreferenceOut(BaseModel):
    email_alerts: bool
    sms_alerts: bool
    web_alerts: bool
    critical_only: bool

class NotificationPreferenceUpdate(BaseModel):
    email_alerts: Optional[bool] = None
    sms_alerts: Optional[bool] = None
    web_alerts: Optional[bool] = None
    critical_only: Optional[bool] = None
