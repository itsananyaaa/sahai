from sqlalchemy import Column, String, DateTime, JSON
from datetime import datetime
from app.models.base import generate_uuid
from app.database import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=False, index=True)
    actor_role = Column(String(30), nullable=False)
    action = Column(String(50), nullable=False) # e.g. LOGIN, CASE_CREATE, REFERRAL_ACK, SYNC_PUSH
    entity = Column(String(50), nullable=False) # case, referral, assessment, user
    entity_id = Column(String(36), nullable=True)
    diff_summary = Column(JSON, nullable=True) # Minimal structural diff without raw PHI
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
