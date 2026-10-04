from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import User, CompanyUser, Notification, NotificationPreference
from app.schemas.notification import (
    NotificationOut, NotificationPreferenceOut, NotificationPreferenceUpdate
)
from app.schemas.common import success_response
from app.core.dependencies import get_current_user, get_current_company_membership

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def get_notifications(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch notifications:
    - Normal User: Gets only personal notifications (user_id match and company_id is NULL).
    - Company User: Gets user notifications or company notifications.
    """
    if not membership or user.account_type == "USER":
        query = select(Notification).where(
            Notification.user_id == user.id,
            Notification.company_id.is_(None)
        ).order_by(Notification.created_at.desc())
    else:
        query = select(Notification).where(
            or_(
                Notification.user_id == user.id,
                Notification.company_id == membership.company_id
            )
        ).order_by(Notification.created_at.desc())

    res = await db.execute(query)
    notes = res.scalars().all()

    out = []
    for n in notes:
        out.append({
            "id": n.id,
            "userId": n.user_id,
            "companyId": n.company_id,
            "type": n.type,
            "severity": n.severity,
            "title": n.title,
            "message": n.message,
            "channel": n.channel,
            "status": n.status,
            "readAt": n.read_at.isoformat() if n.read_at else None,
            "createdAt": n.created_at.isoformat()
        })

    return success_response(out)

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read."""
    res = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id
        )
    )
    note = res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found.")

    note.status = "READ"
    note.read_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()

    return success_response({"message": "Notification marked as read."})

@router.get("/preferences")
async def get_preferences(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get notification preferences for authenticated user."""
    res = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user.id))
    pref = res.scalar_one_or_none()
    if not pref:
        pref = NotificationPreference(user_id=user.id)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)

    out = NotificationPreferenceOut(
        email_alerts=pref.email_alerts,
        sms_alerts=pref.sms_alerts,
        web_alerts=pref.web_alerts,
        critical_only=pref.critical_only
    )
    return success_response(out.model_dump())

@router.patch("/preferences")
async def update_preferences(
    data: NotificationPreferenceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update notification preferences for authenticated user."""
    res = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user.id))
    pref = res.scalar_one_or_none()
    if not pref:
        pref = NotificationPreference(user_id=user.id)
        db.add(pref)

    if data.email_alerts is not None:
        pref.email_alerts = data.email_alerts
    if data.sms_alerts is not None:
        pref.sms_alerts = data.sms_alerts
    if data.web_alerts is not None:
        pref.web_alerts = data.web_alerts
    if data.critical_only is not None:
        pref.critical_only = data.critical_only

    await db.commit()
    await db.refresh(pref)

    out = NotificationPreferenceOut(
        email_alerts=pref.email_alerts,
        sms_alerts=pref.sms_alerts,
        web_alerts=pref.web_alerts,
        critical_only=pref.critical_only
    )
    return success_response(out.model_dump())
