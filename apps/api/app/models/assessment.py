from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import generate_uuid
from app.database import Base

class MviAssessment(Base):
    __tablename__ = "mvi_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("maternal_cases.id"), nullable=False, index=True)
    visit_id = Column(String(36), ForeignKey("visits.id"), nullable=True, unique=True)
    config_version = Column(String(20), default="1.0.0", nullable=False)
    inputs_snapshot = Column(JSON, nullable=False)
    
    clinical_score = Column(Float, nullable=True)
    social_score = Column(Float, nullable=True)
    accessibility_score = Column(Float, nullable=True)
    environmental_score = Column(Float, nullable=True)
    
    overall_score = Column(Float, nullable=False)
    completeness = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)
    upper_bound = Column(Float, nullable=False)
    band = Column(String(30), nullable=False) # lower, moderate, elevated, priority, incomplete_provisional
    
    explanation = Column(JSON, nullable=False)
    computed_on = Column(String(20), default="server", nullable=False) # device, server
    parity_ok = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    maternal_case = relationship("MaternalCase", back_populates="assessments")
    visit = relationship("Visit", back_populates="assessment")

class EmergencyScreen(Base):
    __tablename__ = "emergency_screens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("maternal_cases.id"), nullable=False, index=True)
    visit_id = Column(String(36), ForeignKey("visits.id"), nullable=True, unique=True)
    rule_version = Column(String(20), default="1.0.0", nullable=False)
    has_emergency = Column(Boolean, default=False, nullable=False)
    triggers_fired = Column(JSON, nullable=False)
    result = Column(String(50), nullable=False) # normal, urgent_referral
    action_shown = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    visit = relationship("Visit", back_populates="emergency_screen")
