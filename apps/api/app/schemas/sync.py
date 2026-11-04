from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SyncOperationPayload(BaseModel):
    operation_id: str # Client UUID idempotency key
    device_id: str
    entity: str # case, visit, referral, follow_up
    entity_id: str
    operation_type: str # create, update, delete
    base_version: int = 1
    payload: Dict[str, Any]

class SyncPushRequest(BaseModel):
    device_id: str
    operations: List[SyncOperationPayload]

class OperationResult(BaseModel):
    operation_id: str
    entity: str
    entity_id: str
    status: str # applied, failed, conflict_queued
    error: Optional[str] = None
    server_version: Optional[int] = None

class SyncPushResponse(BaseModel):
    applied_count: int
    failed_count: int
    conflict_count: int
    results: List[OperationResult]

class SyncPullResponse(BaseModel):
    server_time: datetime
    cases: List[Dict[str, Any]]
    visits: List[Dict[str, Any]]
    assessments: List[Dict[str, Any]]
    referrals: List[Dict[str, Any]]
    follow_ups: List[Dict[str, Any]]

class SyncConflictResponse(BaseModel):
    id: str
    operation_id: str
    entity: str
    entity_id: str
    client_payload: Dict[str, Any]
    server_payload: Dict[str, Any]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
