from sqlalchemy import Column, String, Integer, DateTime, JSON, Text
from datetime import datetime
from app.models.base import generate_uuid
from app.database import Base

class SyncOperation(Base):
    __tablename__ = "sync_operations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    operation_id = Column(String(64), unique=True, index=True, nullable=False) # Client idempotency key (UUID)
    device_id = Column(String(64), nullable=False)
    entity = Column(String(50), nullable=False) # case, visit, referral, follow_up
    entity_id = Column(String(36), nullable=False)
    operation_type = Column(String(20), nullable=False) # create, update, delete
    base_version = Column(Integer, default=1, nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), default="applied", nullable=False) # applied, failed, conflict_queued
    error = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class SyncConflict(Base):
    __tablename__ = "sync_conflicts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    operation_id = Column(String(64), nullable=False)
    entity = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    client_payload = Column(JSON, nullable=False)
    server_payload = Column(JSON, nullable=False)
    status = Column(String(20), default="pending", nullable=False) # pending, resolved
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
