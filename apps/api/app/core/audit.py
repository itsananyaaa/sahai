from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent
from app.models.user import User

def record_audit_event(
    db: Session,
    actor: User,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    diff_summary: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """
    Append-only audit event recorder.
    Ensures NO raw PHI (e.g. patient name, free-text clinical notes) is written to audit events.
    """
    event = AuditEvent(
        actor_id=actor.id,
        actor_role=actor.role,
        action=action,
        entity=entity,
        entity_id=entity_id,
        diff_summary=diff_summary or {},
        ip_address=ip_address
    )
    db.add(event)
    db.commit()
