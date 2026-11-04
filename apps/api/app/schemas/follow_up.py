from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class FollowUpCreate(BaseModel):
    id: Optional[str] = None
    case_id: str
    due_date: date
    type: str = "routine_anc"
    notes: Optional[str] = None

class FollowUpUpdate(BaseModel):
    status: Optional[str] = None # Pending, Completed, Rescheduled, Cancelled
    rescheduled_to: Optional[date] = None
    reschedule_reason: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
    version: int

class FollowUpResponse(BaseModel):
    id: str
    case_id: str
    asha_id: str
    due_date: date
    type: str
    status: str
    rescheduled_from: Optional[date]
    completed_at: Optional[datetime]
    outcome: Optional[str]
    notes: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
