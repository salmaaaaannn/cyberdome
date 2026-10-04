from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    result: str
    metadata_json: Optional[str] = None
    timestamp: datetime
