from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict

class ObservationCreate(BaseModel):
    id: Optional[str] = None
    observation_type: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    status: str = "yes" # yes, no, unknown, not_assessed

class ObservationResponse(BaseModel):
    id: str
    observation_type: str
    value_numeric: Optional[float]
    value_text: Optional[str]
    status: str
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class VisitCreate(BaseModel):
    id: Optional[str] = None # Client-generated UUIDv7
    case_id: str
    visit_number: int = Field(default=1, ge=1)
    visit_date: Optional[date] = None
    notes: Optional[str] = None
    supersedes_visit_id: Optional[str] = None
    observations: List[ObservationCreate] = []
    danger_signs: List[str] = []
    mvi_inputs: Optional[Dict[str, Any]] = None

class VisitResponse(BaseModel):
    id: str
    case_id: str
    asha_id: str
    visit_number: int
    visit_date: date
    notes: Optional[str]
    supersedes_visit_id: Optional[str]
    created_at: datetime
    observations: List[ObservationResponse] = []

    model_config = ConfigDict(from_attributes=True)

class DraftCreate(BaseModel):
    id: Optional[str] = None
    entity_type: str
    entity_id: Optional[str] = None
    payload: Dict[str, Any]

class DraftResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: Optional[str]
    payload: Dict[str, Any]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
