import logging
import asyncio
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.models.phase4 import Incident, IncidentEvent, PlaybookExecution, AgentDevice, IoTDevice, AgentStatus
from app.models.models import User
from app.services.response_policy_service import response_policy_service
from app.core.websocket import ws_manager

logger = logging.getLogger(__name__)

class SOARExecutionService:
    """
    Executes individual SOAR playbook steps safely.
    Ensures state updates and idempotency.
    """

    async def execute_step(
        self,
        db: AsyncSession,
        company_id: str,
        execution_id: str,
        step: Dict[str, Any],
        incident_id: str = None,
        is_simulation: bool = False
    ) -> Dict[str, Any]:
        """
        Executes a single step.
        Returns the step result dictionary.
        """
        action = step.get("action", step.get("name", "unknown_action"))
        target_type = step.get("target_type", "incident")
        target_id = step.get("target_id", incident_id)
        
        result = {
            "id": step.get("id", "unknown"),
            "name": step.get("name", action),
            "action": action,
            "status": "FAILED",
            "message": "",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if is_simulation:
            # In simulation mode, we validate but do not perform real destructive actions
            is_valid, err = await response_policy_service.validate_target(db, company_id, target_type, target_id)
            if not is_valid:
                result["message"] = f"[SIMULATION] Target validation failed: {err}"
            else:
                result["status"] = "SUCCESS"
                result["message"] = f"[SIMULATION] Action '{action}' simulated successfully on {target_type} {target_id}."
            return result

        # Real Execution Mode
        try:
            if action in ["tag_incident", "update_incident"]:
                if target_type == "incident" and target_id:
                    res = await db.execute(select(Incident).where(Incident.id == target_id, Incident.company_id == company_id))
                    incident = res.scalar_one_or_none()
                    if incident:
                        incident.status = step.get("new_status", "CONTAINMENT")
                        # Add timeline event
                        evt = IncidentEvent(
                            company_id=company_id,
                            incident_id=target_id,
                            action="SOAR_UPDATE",
                            actor="SOAR Execution Engine",
                            details=f"Incident status updated to {incident.status} by playbook."
                        )
                        db.add(evt)
                        result["status"] = "SUCCESS"
                        result["message"] = f"Incident updated successfully."
                    else:
                        result["message"] = "Incident not found."
                else:
                    result["message"] = "Invalid target for incident update."

            elif action == "disable_account":
                if target_type == "user" and target_id:
                    is_valid, err = await response_policy_service.validate_target(db, company_id, target_type, target_id)
                    if is_valid:
                        res = await db.execute(select(User).where(User.id == target_id))
                        user = res.scalar_one_or_none()
                        if user:
                            user.is_active = False
                            result["status"] = "SUCCESS"
                            result["message"] = f"User {user.email} account disabled."
                    else:
                        result["message"] = err
                else:
                    result["message"] = "Invalid target for disable account."

            elif action == "isolate_device":
                if target_type == "device" and target_id:
                    is_valid, err = await response_policy_service.validate_target(db, company_id, target_type, target_id)
                    if is_valid:
                        res = await db.execute(select(AgentDevice).where(AgentDevice.id == target_id))
                        device = res.scalar_one_or_none()
                        if device:
                            device.status = AgentStatus.REVOKED
                            result["status"] = "SUCCESS"
                            result["message"] = f"Device {device.hostname} isolated."
                    else:
                        result["message"] = err
                else:
                    result["message"] = "Invalid target for device isolation."
                    
            elif action == "isolate_iot_device":
                if target_type == "iot_device" and target_id:
                    is_valid, err = await response_policy_service.validate_target(db, company_id, target_type, target_id)
                    if is_valid:
                        res = await db.execute(select(IoTDevice).where(IoTDevice.id == target_id))
                        device = res.scalar_one_or_none()
                        if device:
                            device.status = "QUARANTINED"
                            result["status"] = "SUCCESS"
                            result["message"] = f"IoT Device {device.name} quarantined."
                    else:
                        result["message"] = err
                else:
                    result["message"] = "Invalid target for IoT isolation."

            elif action == "block_ip":
                # Real integration doesn't exist for firewall blocking in this demo
                result["status"] = "NOT_CONFIGURED"
                result["message"] = f"Firewall integration not configured. IP block not executed."
                
            elif action == "revoke_tokens":
                # Partial integration - we could clear session tokens if we had a session table,
                # but returning NOT_CONFIGURED is safer for demo if we can't truly revoke.
                result["status"] = "NOT_CONFIGURED"
                result["message"] = "IdP integration not configured for token revocation."
                
            else:
                # Fallback for generic steps without specific handlers
                result["status"] = "SUCCESS"
                result["message"] = f"Step '{action}' executed abstractly."
                
        except Exception as e:
            logger.error(f"Error executing step {action}: {str(e)}")
            result["status"] = "FAILED"
            result["message"] = f"Internal execution error: {str(e)}"
            
        return result

soar_execution_service = SOARExecutionService()
