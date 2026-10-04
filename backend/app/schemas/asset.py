from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AssetCreate(BaseModel):
    name: str
    asset_type: str # 'WEBSITE', 'DOMAIN', 'SERVER', 'DATABASE', 'APPLICATION', 'CLOUD', 'IOT_DEVICE', 'NETWORK'
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    criticality: Optional[str] = "HIGH"
    description: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
    description: Optional[str] = None

class AssetOut(BaseModel):
    id: str
    company_id: str
    name: str
    asset_type: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    domain: Optional[str] = None
    status: str
    criticality: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
