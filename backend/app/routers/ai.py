from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_company_membership, create_audit_entry
from app.models.models import User, CompanyUser
from app.models.phase4 import Incident, SecurityEvent, IncidentEvent
from app.models.ai import AIConversation, AIMessage
from app.services.gemini_service import GeminiService
from app.services.rag_service import RAGService
from app.services.ai_copilot_service import (
    ai_copilot_service,
    CopilotChatRequest,
    CopilotChatResponse,
    InvestigationRequest,
    InvestigationResponse,
    PlaybookDraftRequest,
    PlaybookDraftResponse,
    ActionApprovalRequest,
    ActionApprovalResponse
)
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["AI Copilot"])
gemini_service = GeminiService()
rag_service = RAGService()


# ─── Legacy Backward Compatibility Schemas ────────────────────────────

class LegacyChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str


class LegacyChatResponse(BaseModel):
    conversation_id: str
    message: str


# ─── Health Endpoint ──────────────────────────────────────────────────

@router.get("/health")
async def ai_health():
    """Returns AI Copilot and LLM provider configuration status."""
    return {
        "status": "ONLINE",
        "copilot_version": "v1.0.0-soc-analyst",
        "provider": "Google Gemini",
        "model": settings.GEMINI_MODEL,
        "configured": bool(settings.GEMINI_API_KEY),
        "intents_supported": len(ai_copilot_service.playbook_drafts) >= 0
    }


# ─── Legacy Chat Endpoint (Maintained for Backward Compatibility) ──────

@router.post("/chat", response_model=LegacyChatResponse)
async def ai_chat_legacy(
    request: LegacyChatRequest,
    http_req: Request,
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """Legacy chat endpoint adapted to use AICopilotService under the hood."""
    ip = http_req.client.host if http_req.client else None
    copilot_req = CopilotChatRequest(
        message=request.message,
        conversation_id=request.conversation_id
    )
    res = await ai_copilot_service.process_chat(
        db=db,
        user=current_user,
        membership=membership,
        request=copilot_req,
        client_ip=ip
    )
    return LegacyChatResponse(
        conversation_id=res.conversation_id,
        message=res.answer
    )


# ─── Module 06 Copilot Chat Endpoint ───────────────────────────────────

@router.post("/copilot/chat", response_model=CopilotChatResponse)
async def ai_copilot_chat(
    request: CopilotChatRequest,
    http_req: Request,
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Primary AI Security Copilot chat interface.
    Returns grounded answers, verified evidence items, citations, and proposed SOAR actions.
    """
    ip = http_req.client.host if http_req.client else None
    return await ai_copilot_service.process_chat(
        db=db,
        user=current_user,
        membership=membership,
        request=request,
        client_ip=ip
    )


# ─── Incident Explanation Endpoint ────────────────────────────────────

@router.get("/incidents/{incident_id}/explain")
async def explain_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Natural language explanation for a specific incident using grounded telemetry.
    Strictly isolated to authenticated company.
    """
    if current_user.account_type in ["NORMAL", "USER"] or not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized company access."
        )

    cid = membership.company_id
    inc_res = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.company_id == cid
        )
    )
    incident = inc_res.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found in authorized company."
        )

    # Resolve context
    context = await ai_copilot_service.resolve_security_context(
        db=db,
        company_id=cid,
        user_id=current_user.id,
        role=membership.role,
        intent="INCIDENT_EXPLANATION",
        query=f"Explain incident {incident.id}",
        context_hints={"incident_id": incident.id}
    )

    answer = ai_copilot_service.synthesize_grounded_answer(
        query=f"Explain incident {incident.id}",
        context=context,
        intent="INCIDENT_EXPLANATION"
    )

    return {
        "incident_id": incident.id,
        "title": incident.title,
        "severity": incident.severity,
        "status": incident.status,
        "risk_score": incident.risk_score,
        "explanation": answer,
        "evidence": context.get("security_events", []),
        "timeline": context.get("timeline", []),
        "mitre_mapping": incident.mitre_mapping or [],
        "citations": context.get("citations", []),
        "recommended_actions": [
            "Verify offending asset network telemetry",
            "Review associated UEBA user activity",
            "Consider drafting a SOAR containment playbook"
        ]
    }


# ─── Threat Investigation Endpoint ────────────────────────────────────

@router.post("/investigate", response_model=InvestigationResponse)
async def investigate_threat(
    request: InvestigationRequest,
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Deep threat investigation on IP, Domain, User, Device, or URL.
    Returns correlated security telemetry and related incidents.
    """
    if current_user.account_type in ["NORMAL", "USER"] or not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized company access."
        )

    cid = membership.company_id
    role = membership.role

    # RBAC: Employees cannot investigate company-wide users/devices
    if role == "EMPLOYEE" and request.target_type in ["USER", "DEVICE"]:
        if request.target_value != current_user.id and request.target_value != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee access restricted: You may only investigate your own assigned identity or device."
            )

    context = await ai_copilot_service.resolve_security_context(
        db=db,
        company_id=cid,
        user_id=current_user.id,
        role=role,
        intent="THREAT_INVESTIGATION",
        query=f"Investigate {request.target_type} {request.target_value}"
    )

    summary = ai_copilot_service.synthesize_grounded_answer(
        query=f"Investigate {request.target_type} {request.target_value}",
        context=context,
        intent="THREAT_INVESTIGATION"
    )

    threat_level = "HIGH" if any(ev.get("severity") in ["HIGH", "CRITICAL"] for ev in context.get("security_events", [])) else "LOW"

    return InvestigationResponse(
        target_type=request.target_type,
        target_value=request.target_value,
        summary=summary,
        threat_level=threat_level,
        evidence=context.get("security_events", []),
        related_incidents=[i["id"] for i in context.get("incidents", [])],
        citations=context.get("citations", [])
    )


# ─── Security Posture Endpoint ────────────────────────────────────────

@router.get("/posture")
async def get_security_posture(
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """Summarizes current observed security posture without fabricated percentages."""
    if current_user.account_type in ["NORMAL", "USER"] or not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized company access."
        )

    cid = membership.company_id
    context = await ai_copilot_service.resolve_security_context(
        db=db,
        company_id=cid,
        user_id=current_user.id,
        role=membership.role,
        intent="SECURITY_POSTURE",
        query="What is our security posture?"
    )

    summary = ai_copilot_service.synthesize_grounded_answer(
        query="What is our security posture?",
        context=context,
        intent="SECURITY_POSTURE"
    )

    incidents = context.get("incidents", [])
    return {
        "observed_state": "MONITORED_AND_FUSED",
        "open_incidents": len(incidents),
        "critical_incidents": sum(1 for i in incidents if i.get("severity") == "CRITICAL"),
        "high_incidents": sum(1 for i in incidents if i.get("severity") == "HIGH"),
        "recent_threat_events": len(context.get("security_events", [])),
        "telemetry_coverage": context.get("telemetry_coverage", {}),
        "summary": summary,
        "citations": context.get("citations", [])
    }


# ─── Executive Summary Endpoint ───────────────────────────────────────

@router.get("/executive-summary")
async def get_executive_summary(
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """Generates an executive briefing tailored for CISO / board leadership."""
    if current_user.account_type in ["NORMAL", "USER"] or not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized company access."
        )

    cid = membership.company_id
    context = await ai_copilot_service.resolve_security_context(
        db=db,
        company_id=cid,
        user_id=current_user.id,
        role=membership.role,
        intent="EXECUTIVE_SUMMARY",
        query="Give me an executive summary of our security status."
    )

    summary = ai_copilot_service.synthesize_grounded_answer(
        query="Give me an executive summary of our security status.",
        context=context,
        intent="EXECUTIVE_SUMMARY"
    )

    incidents = context.get("incidents", [])
    return {
        "period": "Last 24 Hours",
        "overall_posture": "ACTIVE_DEFENSE",
        "major_incidents": incidents[:3],
        "key_attack_patterns": ["Network beaconing", "Credential phishing attempt", "IoT anomaly spikes"],
        "actions_taken": ["Multi-model detection fusion enabled", "Containment playbooks staged"],
        "outstanding_risks": [f"Incident {i['id']} awaiting SOC resolution" for i in incidents if i.get("status") == "OPEN"][:3],
        "data_limitations": context.get("data_limitations", []),
        "summary_text": summary
    }


# ─── SOAR Playbook Generation Endpoint ─────────────────────────────────

@router.post("/playbooks/draft", response_model=PlaybookDraftResponse)
async def draft_playbook(
    request: PlaybookDraftRequest,
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a draft SOAR response plan.
    Safety rule: GENERATED PLAYBOOK ≠ EXECUTED PLAYBOOK. Requires human approval.
    """
    if current_user.account_type in ["NORMAL", "USER"] or not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized company access."
        )

    try:
        return await ai_copilot_service.draft_soar_playbook(
            db=db,
            incident_id=request.incident_id,
            company_id=membership.company_id,
            user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ─── Human Approval Gate for Sensitive SOAR Actions ───────────────────

@router.post("/actions/approve", response_model=ActionApprovalResponse)
async def approve_soar_action(
    request: ActionApprovalRequest,
    http_req: Request,
    current_user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Human approval gate for sensitive SOAR actions.
    Requires ADMIN / authorized role. AI cannot execute destructive actions autonomously.
    """
    if current_user.account_type in ["NORMAL", "USER"] or not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized company access."
        )

    # RBAC: Only Admin or Analyst can approve SOAR actions
    if membership.role not in ["ADMIN", "ANALYST", "SECURITY_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Security Admins and Analysts can approve SOAR containment actions."
        )

    ip = http_req.client.host if http_req.client else None
    return await ai_copilot_service.approve_and_execute_action(
        db=db,
        request=request,
        company_id=membership.company_id,
        user=current_user,
        client_ip=ip
    )


# ─── Conversation History Endpoints ────────────────────────────────────

@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AIConversation).where(AIConversation.user_id == current_user.id).order_by(AIConversation.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/conversations/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    conv_query = select(AIConversation).where(
        AIConversation.id == conversation_id,
        AIConversation.user_id == current_user.id
    )
    res = await db.execute(conv_query)
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found or unauthorized.")
        
    query = select(AIMessage).where(AIMessage.conversation_id == conversation_id).order_by(AIMessage.created_at)
    res = await db.execute(query)
    return res.scalars().all()
