from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AssessmentCreate(BaseModel):
    id: Optional[str] = None
    case_id: str
    visit_id: Optional[str] = None
    inputs: Dict[str, Any]
    client_score: Optional[float] = None
    client_band: Optional[str] = None

class AssessmentResponse(BaseModel):
    id: str
    case_id: str
    visit_id: Optional[str]
    config_version: str
    clinical_score: Optional[float]
    social_score: Optional[float]
    accessibility_score: Optional[float]
    environmental_score: Optional[float]
    overall_score: float
    completeness: float
    lower_bound: float
    upper_bound: float
    band: str
    explanation: Dict[str, Any]
    computed_on: str
    parity_ok: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EmergencyResponse(BaseModel):
    id: str
    case_id: str
    visit_id: Optional[str]
    rule_version: str
    has_emergency: bool
    triggers_fired: List[str]
    result: str
    action_shown: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
