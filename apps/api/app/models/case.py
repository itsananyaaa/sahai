from sqlalchemy import Column, String, Integer, Float, Date, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel, generate_uuid
from app.database import Base

class MaternalCase(BaseModel):
    __tablename__ = "maternal_cases"

    case_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. SYN-0042
    first_name = Column(String(100), nullable=False) # Display first name / initials only
    age = Column(Integer, nullable=False)
    lmp_date = Column(Date, nullable=True)
    edd_date = Column(Date, nullable=True)
    gestational_age_weeks = Column(Float, nullable=True)
    
    gravida = Column(Integer, default=1, nullable=False)
    parity = Column(Integer, default=0, nullable=False)
    prior_c_section = Column(String(20), default="no", nullable=False) # yes, no, unknown
    
    birth_order = Column(Integer, default=1, nullable=False)
    education_level = Column(String(50), default="secondary", nullable=False)
    household_autonomy = Column(String(50), default="shared_decision", nullable=True)
    
    assigned_asha_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    catchment_village = Column(String(100), nullable=False)
    nearest_facility_id = Column(String(36), ForeignKey("facilities.id"), nullable=True)
    
    consent_status = Column(String(30), default="pending", nullable=False) # pending, given, withdrawn
    status = Column(String(30), default="active", nullable=False) # active, delivered, transferred, closed

    assigned_asha = relationship("User", foreign_keys=[assigned_asha_id])
    nearest_facility = relationship("Facility", foreign_keys=[nearest_facility_id])
    consent_records = relationship("ConsentRecord", back_populates="maternal_case", cascade="all, delete-orphan")
    visits = relationship("Visit", back_populates="maternal_case", cascade="all, delete-orphan")
    assessments = relationship("MviAssessment", back_populates="maternal_case", cascade="all, delete-orphan")
    referrals = relationship("Referral", back_populates="maternal_case", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="maternal_case", cascade="all, delete-orphan")

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("maternal_cases.id"), nullable=False, index=True)
    purpose = Column(String(150), default="maternal_care_decision_support", nullable=False)
    notice_version = Column(String(20), default="v1.0", nullable=False)
    language = Column(String(10), default="en", nullable=False)
    status = Column(String(20), default="given", nullable=False) # given, withdrawn
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    recorded_by = Column(String(36), ForeignKey("users.id"), nullable=False)

    # DPDP Rules 2025: Guardian consent required if beneficiary age < 18
    guardian_name = Column(String(100), nullable=True)
    guardian_relation = Column(String(50), nullable=True)
    guardian_consent_given = Column(Boolean, default=False, nullable=True)

    maternal_case = relationship("MaternalCase", back_populates="consent_records")
