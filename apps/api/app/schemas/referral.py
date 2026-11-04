from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict

class ReferralEventResponse(BaseModel):
    id: str
    from_status: str
    to_status: str
    note: Optional[str]
    actor_id: str
    actor_role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ClinicalNoteCreate(BaseModel):
    text: str = Field(..., min_length=2)
    visibility: str = "all" # all, phc_only
    original_language: str = "en"

class ClinicalNoteResponse(BaseModel):
    id: str
    case_id: str
    referral_id: Optional[str]
    author_id: str
    author_role: str
    text: str
    visibility: str
    original_language: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReferralCreate(BaseModel):
    id: Optional[str] = None
    case_id: str
    visit_id: Optional[str] = None
    reason_codes: List[str]
    priority: str = "Routine" # Urgent, Priority, Routine
    priority_override_reason: Optional[str] = None
    receiving_facility_id: str
    appointment_date: Optional[date] = None
    transport_status: Optional[str] = "arranged"

class ReferralTransition(BaseModel):
    to_status: str
    note: Optional[str] = None
    cancellation_reason: Optional[str] = None
    outcome: Optional[str] = None
    version: int

class ReferralResponse(BaseModel):
    id: str
    case_id: str
    visit_id: Optional[str]
    reason_codes: List[str]
    priority: str
    priority_override_reason: Optional[str]
    receiving_facility_id: str
    status: str
    cancellation_reason: Optional[str]
    appointment_date: Optional[date]
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    outcome: Optional[str]
    transport_status: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime
    events: List[ReferralEventResponse] = []
    clinical_notes: List[ClinicalNoteResponse] = []

    model_config = ConfigDict(from_attributes=True)
