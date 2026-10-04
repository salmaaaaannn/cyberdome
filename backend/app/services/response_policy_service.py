import logging
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException

from app.models.models import User, CompanyUser
from app.models.phase4 import AgentDevice, IoTDevice

logger = logging.getLogger(__name__)

class ActionRisk(str):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ResponsePolicyService:
    """
    Evaluates response policies, determines approval requirements,
    and validates targets before action execution.
    """

    ACTION_RISK_MAP = {
        "tag_incident": ActionRisk.LOW,
        "notify_user": ActionRisk.LOW,
        "add_comment": ActionRisk.LOW,
        "block_ip": ActionRisk.MEDIUM,
        "disable_account": ActionRisk.HIGH,
        "revoke_tokens": ActionRisk.HIGH,
        "isolate_device": ActionRisk.HIGH,
        "isolate_iot_device": ActionRisk.HIGH,
        "initiate_lockdown": ActionRisk.CRITICAL
    }

    @staticmethod
    def get_action_risk(action_type: str) -> str:
        """Get the predefined risk level for a given action type."""
        return ResponsePolicyService.ACTION_RISK_MAP.get(action_type, ActionRisk.HIGH) # Default to HIGH for unknown

    @staticmethod
    def requires_approval(action_type: str, policy_override: bool = False) -> bool:
        """
        Determine if an action requires human approval.
        By default, HIGH and CRITICAL actions require approval.
        """
        risk = ResponsePolicyService.get_action_risk(action_type)
        if policy_override and risk == ActionRisk.HIGH:
            return False # Policy allows bypassing approval for this HIGH risk action
        return risk in [ActionRisk.HIGH, ActionRisk.CRITICAL]

    @staticmethod
    async def validate_target(
        db: AsyncSession,
        company_id: str,
        target_type: str,
        target_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates that a target exists and belongs to the given company.
        Returns (is_valid, error_message).
        """
        if not target_id:
            return False, "Target ID is missing."

        try:
            if target_type == "user":
                res = await db.execute(
                    select(User).join(CompanyUser).where(
                        User.id == target_id,
                        CompanyUser.company_id == company_id
                    )
                )
                if not res.scalar_one_or_none():
                    return False, f"User {target_id} not found or does not belong to company."
                return True, None

            elif target_type == "device":
                res = await db.execute(
                    select(AgentDevice).where(
                        AgentDevice.id == target_id,
                        AgentDevice.company_id == company_id
                    )
                )
                if not res.scalar_one_or_none():
                    return False, f"Device {target_id} not found or does not belong to company."
                return True, None

            elif target_type == "iot_device":
                res = await db.execute(
                    select(IoTDevice).where(
                        IoTDevice.id == target_id,
                        IoTDevice.company_id == company_id
                    )
                )
                if not res.scalar_one_or_none():
                    return False, f"IoT Device {target_id} not found or does not belong to company."
                return True, None

            elif target_type == "ip":
                # IP target validation is generally regex/format based, not DB lookup
                # In a real system we might check if it's an internal whitelist IP
                return True, None
                
            elif target_type == "incident":
                from app.models.phase4 import Incident
                res = await db.execute(
                    select(Incident).where(
                        Incident.id == target_id,
                        Incident.company_id == company_id
                    )
                )
                if not res.scalar_one_or_none():
                    return False, f"Incident {target_id} not found or does not belong to company."
                return True, None

            return False, f"Unknown target type: {target_type}"
            
        except Exception as e:
            logger.error(f"Error validating target {target_type} {target_id}: {str(e)}")
            return False, "Internal validation error."

response_policy_service = ResponsePolicyService()
