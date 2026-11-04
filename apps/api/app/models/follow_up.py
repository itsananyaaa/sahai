from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel
from app.database import Base

class FollowUp(BaseModel):
    __tablename__ = "follow_ups"

    case_id = Column(String(36), ForeignKey("maternal_cases.id"), nullable=False, index=True)
    asha_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    due_date = Column(Date, nullable=False)
    type = Column(String(50), default="routine_anc", nullable=False) # routine_anc, bp_monitoring, referral_follow_up, post_partum
    status = Column(String(30), default="Pending", nullable=False) # Pending, Completed, Rescheduled, Cancelled
    
    rescheduled_from = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    outcome = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    maternal_case = relationship("MaternalCase", back_populates="follow_ups")
    asha = relationship("User", foreign_keys=[asha_id])
