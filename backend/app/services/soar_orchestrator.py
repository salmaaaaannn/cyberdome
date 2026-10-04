import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.models.phase4 import SOARPlaybook, PlaybookExecution, Incident, IncidentEvent
from app.services.response_policy_service import response_policy_service
from app.services.soar_execution_service import soar_execution_service
from app.core.websocket import ws_manager

logger = logging.getLogger(__name__)

class SOAROrchestrator:
    """
    Coordinates SOAR playbook execution.
    Enforces policies, manages state transitions, and handles approvals.
    """

    async def initiate_playbook(
        self,
        db: AsyncSession,
        company_id: str,
        playbook_id: str,
        incident_id: Optional[str] = None,
        actor: str = "System",
        is_simulation: bool = False
    ) -> PlaybookExecution:
        """
        Starts the execution of a playbook.
        Creates the execution record and transitions to RUNNING or WAITING_APPROVAL.
        """
        # Fetch playbook
        res = await db.execute(select(SOARPlaybook).where(SOARPlaybook.id == playbook_id, SOARPlaybook.company_id == company_id))
        playbook = res.scalar_one_or_none()
        
        if not playbook:
            raise ValueError("Playbook not found.")
        if not playbook.is_active:
            raise ValueError("Playbook is inactive.")

        # Create execution record
        execution = PlaybookExecution(
            company_id=company_id,
            playbook_id=playbook_id,
            incident_id=incident_id,
            status="PENDING",
            actor=actor,
            result={"steps": []}
        )
        db.add(execution)
        await db.commit()
        await db.refresh(execution)

        # Check if any step requires human approval
        requires_approval = False
        steps = playbook.steps or []
        for step in steps:
            action = step.get("action") or step.get("name")
            if response_policy_service.requires_approval(action):
                requires_approval = True
                break

        if requires_approval and not is_simulation:
            # Module 06 built a human approval mechanism for AI. We reuse the spirit of that here
            # by pausing execution until explicitly approved.
            execution.status = "WAITING_APPROVAL"
            await db.commit()
            
            # Notify SOC that approval is needed
            await ws_manager.broadcast_to_company(
                company_id,
                "soar_approval_required",
                {
                    "executionId": execution.id,
                    "playbookName": playbook.name,
                    "incidentId": incident_id
                }
            )
            return execution

        # If no approval needed (or it's a simulation), proceed to execution
        return await self.execute_playbook_steps(db, company_id, execution.id, is_simulation)

    async def execute_playbook_steps(
        self,
        db: AsyncSession,
        company_id: str,
        execution_id: str,
        is_simulation: bool = False
    ) -> PlaybookExecution:
        """
        Executes the steps of an approved or auto-approved playbook execution.
        """
        res = await db.execute(select(PlaybookExecution).where(PlaybookExecution.id == execution_id, PlaybookExecution.company_id == company_id))
        execution = res.scalar_one_or_none()
        
        if not execution:
            raise ValueError("Execution not found.")
            
        if execution.status not in ["PENDING", "WAITING_APPROVAL"]:
            raise ValueError(f"Cannot execute playbook in status: {execution.status}")

        execution.status = "RUNNING"
        execution.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()

        # Fetch playbook definition for steps
        res_pb = await db.execute(select(SOARPlaybook).where(SOARPlaybook.id == execution.playbook_id))
        playbook = res_pb.scalar_one()

        step_results = []
        overall_status = "SUCCESS"

        for step in (playbook.steps or []):
            step_res = await soar_execution_service.execute_step(
                db=db,
                company_id=company_id,
                execution_id=execution.id,
                step=step,
                incident_id=execution.incident_id,
                is_simulation=is_simulation
            )
            step_results.append(step_res)
            if step_res["status"] == "FAILED":
                overall_status = "FAILED"
                break # Stop on first failure by default
            elif step_res["status"] == "NOT_CONFIGURED":
                # We record it but it doesn't necessarily fail the whole playbook unless we want strict mode
                overall_status = "PARTIAL_SUCCESS"

        execution.status = overall_status
        execution.result = {"steps": step_results, "is_simulation": is_simulation}
        execution.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()

        # Update Incident timeline if linked
        if execution.incident_id:
            res_inc = await db.execute(select(Incident).where(Incident.id == execution.incident_id))
            incident = res_inc.scalar_one_or_none()
            if incident:
                evt = IncidentEvent(
                    company_id=company_id,
                    incident_id=incident.id,
                    action="SOAR_EXECUTION_COMPLETED",
                    actor=execution.actor,
                    details=f"Playbook '{playbook.name}' completed with status {overall_status}. ({len(step_results)} steps executed)"
                )
                db.add(evt)
                await db.commit()
                
                await ws_manager.broadcast_to_company(
                    company_id,
                    "incident_updated",
                    {
                        "id": incident.id,
                        "status": incident.status,
                        "correlated_detection": f"SOAR Playbook finished: {playbook.name} [{overall_status}]"
                    }
                )

        # Notify UI of completion
        await ws_manager.broadcast_to_company(
            company_id,
            "soar_execution_completed",
            {
                "id": execution.id,
                "playbookId": playbook.id,
                "playbookName": playbook.name,
                "status": overall_status,
                "incidentId": execution.incident_id,
            }
        )

        return execution

    async def approve_execution(
        self,
        db: AsyncSession,
        company_id: str,
        execution_id: str,
        approver_id: str
    ) -> PlaybookExecution:
        """
        Manually approve a WAITING_APPROVAL execution.
        """
        res = await db.execute(select(PlaybookExecution).where(PlaybookExecution.id == execution_id, PlaybookExecution.company_id == company_id))
        execution = res.scalar_one_or_none()
        
        if not execution or execution.status != "WAITING_APPROVAL":
            raise ValueError("Execution not found or not waiting for approval.")
            
        # Log approval
        if execution.incident_id:
            evt = IncidentEvent(
                company_id=company_id,
                incident_id=execution.incident_id,
                action="SOAR_EXECUTION_APPROVED",
                actor=approver_id,
                details=f"Execution {execution_id} manually approved."
            )
            db.add(evt)
            await db.commit()

        return await self.execute_playbook_steps(db, company_id, execution_id, is_simulation=False)

    async def cancel_execution(
        self,
        db: AsyncSession,
        company_id: str,
        execution_id: str,
        actor: str
    ) -> PlaybookExecution:
        """
        Cancel a WAITING_APPROVAL execution.
        """
        res = await db.execute(select(PlaybookExecution).where(PlaybookExecution.id == execution_id, PlaybookExecution.company_id == company_id))
        execution = res.scalar_one_or_none()
        
        if not execution or execution.status != "WAITING_APPROVAL":
            raise ValueError("Execution not found or not waiting for approval.")
            
        execution.status = "CANCELLED"
        execution.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        
        if execution.incident_id:
            evt = IncidentEvent(
                company_id=company_id,
                incident_id=execution.incident_id,
                action="SOAR_EXECUTION_CANCELLED",
                actor=actor,
                details=f"Execution {execution_id} manually cancelled."
            )
            db.add(evt)
            await db.commit()

        return execution

soar_orchestrator = SOAROrchestrator()
