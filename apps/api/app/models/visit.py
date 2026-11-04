from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel, generate_uuid
from app.database import Base

class Visit(Base):
    __tablename__ = "visits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("maternal_cases.id"), nullable=False, index=True)
    asha_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    visit_number = Column(Integer, default=1, nullable=False)
    visit_date = Column(Date, default=datetime.utcnow().date, nullable=False)
    notes = Column(Text, nullable=True)
    supersedes_visit_id = Column(String(36), ForeignKey("visits.id"), nullable=True) # Append-only correction chain
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(String(36), nullable=False)

    maternal_case = relationship("MaternalCase", back_populates="visits")
    observations = relationship("Observation", back_populates="visit", cascade="all, delete-orphan")
    assessment = relationship("MviAssessment", back_populates="visit", uselist=False)
    emergency_screen = relationship("EmergencyScreen", back_populates="visit", uselist=False)

class Observation(Base):
    __tablename__ = "observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    visit_id = Column(String(36), ForeignKey("visits.id"), nullable=False, index=True)
    observation_type = Column(String(50), nullable=False) # bp_systolic, bp_diastolic, pallor, hb, danger_sign, etc.
    value_numeric = Column(Float, nullable=True)
    value_text = Column(String(100), nullable=True)
    status = Column(String(20), default="yes", nullable=False) # yes, no, unknown, not_assessed
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    visit = relationship("Visit", back_populates="observations")

class Draft(Base):
    __tablename__ = "drafts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False) # new_case, visit, referral
    entity_id = Column(String(50), nullable=True)
    payload = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
