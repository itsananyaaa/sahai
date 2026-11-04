from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict

class ConsentCreate(BaseModel):
    purpose: str = "maternal_care_decision_support"
    notice_version: str = "v1.0"
    language: str = "en"
    status: str = "given"
    guardian_name: Optional[str] = None
    guardian_relation: Optional[str] = None
    guardian_consent_given: Optional[bool] = False

class ConsentResponse(BaseModel):
    id: str
    purpose: str
    notice_version: str
    language: str
    status: str
    timestamp: datetime
    guardian_name: Optional[str]
    guardian_relation: Optional[str]
    guardian_consent_given: Optional[bool]

    model_config = ConfigDict(from_attributes=True)

class CaseCreate(BaseModel):
    id: Optional[str] = None # Client-generated UUIDv7 for offline-first creation
    case_code: Optional[str] = None # Auto-generated if absent
    first_name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=12, le=60)
    lmp_date: Optional[date] = None
    edd_date: Optional[date] = None
    gravida: int = Field(default=1, ge=1)
    parity: int = Field(default=0, ge=0)
    prior_c_section: str = Field(default="no") # yes, no, unknown
    birth_order: int = Field(default=1, ge=1)
    education_level: str = "secondary"
    household_autonomy: Optional[str] = "shared_decision"
    catchment_village: str
    nearest_facility_id: Optional[str] = None
    consent: Optional[ConsentCreate] = None

class CaseUpdate(BaseModel):
    first_name: Optional[str] = None
    age: Optional[int] = None
    lmp_date: Optional[date] = None
    edd_date: Optional[date] = None
    gravida: Optional[int] = None
    parity: Optional[int] = None
    prior_c_section: Optional[str] = None
    education_level: Optional[str] = None
    household_autonomy: Optional[str] = None
    nearest_facility_id: Optional[str] = None
    status: Optional[str] = None
    version: int

class CaseResponse(BaseModel):
    id: str
    case_code: str
    first_name: str
    age: int
    lmp_date: Optional[date]
    edd_date: Optional[date]
    gestational_age_weeks: Optional[float]
    gravida: int
    parity: int
    prior_c_section: str
    birth_order: int
    education_level: str
    household_autonomy: Optional[str]
    assigned_asha_id: str
    catchment_village: str
    nearest_facility_id: Optional[str]
    consent_status: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
