from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.audit import AuditEvent
from app.core.rbac import get_current_user, require_roles
from app.core.exceptions import SahaiException

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("")
def list_audit_events(
    limit: int = Query(default=100, le=200),
    offset: int = 0,
    current_user: User = Depends(require_roles([RoleEnum.DISTRICT_ADMIN])),
    db: Session = Depends(get_db)
):
    events = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": e.id,
            "actor_id": e.actor_id,
            "actor_role": e.actor_role,
            "action": e.action,
            "entity": e.entity,
            "entity_id": e.entity_id,
            "diff_summary": e.diff_summary,
            "ip_address": e.ip_address,
            "created_at": e.created_at.isoformat()
        }
        for e in events
    ]
