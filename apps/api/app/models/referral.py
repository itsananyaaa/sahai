from sqlalchemy import Column, String, DateTime, Date, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel, generate_uuid
from app.database import Base

class Referral(BaseModel):
    __tablename__ = "referrals"

    case_id = Column(String(36), ForeignKey("maternal_cases.id"), nullable=False, index=True)
    visit_id = Column(String(36), ForeignKey("visits.id"), nullable=True)
    reason_codes = Column(JSON, nullable=False) # e.g. ["severe_hypertension", "prior_c_section"]
    priority = Column(String(20), default="Routine", nullable=False) # Urgent, Priority, Routine
    priority_override_reason = Column(String(255), nullable=True)
    
    receiving_facility_id = Column(String(36), ForeignKey("facilities.id"), nullable=False, index=True)
    status = Column(String(30), default="Draft", nullable=False) # Draft, Pending, Acknowledged, In Progress, Completed, Cancelled
    cancellation_reason = Column(String(255), nullable=True)
    
    appointment_date = Column(Date, nullable=True)
    acknowledged_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    outcome = Column(String(100), nullable=True)
    transport_status = Column(String(50), default="arranged", nullable=True)

    maternal_case = relationship("MaternalCase", back_populates="referrals")
    receiving_facility = relationship("Facility", foreign_keys=[receiving_facility_id])
    events = relationship("ReferralEvent", back_populates="referral", cascade="all, delete-orphan", order_by="ReferralEvent.created_at")
    clinical_notes = relationship("ClinicalNote", back_populates="referral", cascade="all, delete-orphan")

class ReferralEvent(Base):
    __tablename__ = "referral_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    referral_id = Column(String(36), ForeignKey("referrals.id"), nullable=False, index=True)
    from_status = Column(String(30), nullable=False)
    to_status = Column(String(30), nullable=False)
    note = Column(String(255), nullable=True)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    actor_role = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    referral = relationship("Referral", back_populates="events")

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("maternal_cases.id"), nullable=False, index=True)
    referral_id = Column(String(36), ForeignKey("referrals.id"), nullable=True)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    author_role = Column(String(30), nullable=False)
    text = Column(Text, nullable=False)
    visibility = Column(String(20), default="all", nullable=False) # all, phc_only
    original_language = Column(String(10), default="en", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    referral = relationship("Referral", back_populates="clinical_notes")
