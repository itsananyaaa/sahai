import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel, generate_uuid
from app.database import Base

class RoleEnum(str, enum.Enum):
    ASHA = "asha"
    ANM_PHC = "anm_phc"
    DISTRICT_ADMIN = "district_admin"

class FacilityTypeEnum(str, enum.Enum):
    SC = "Sub Centre (SC)"
    PHC = "Primary Health Centre (PHC)"
    CHC = "Community Health Centre (CHC)"
    FRU = "First Referral Unit (FRU)"
    DH = "District Hospital (DH)"
    BLOOD_BANK = "Blood Bank Facility"

class AdminUnit(Base):
    __tablename__ = "admin_units"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    level = Column(String(20), nullable=False)  # district, block, village
    parent_id = Column(String(36), ForeignKey("admin_units.id"), nullable=True)

class Facility(Base):
    __tablename__ = "facilities"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    facility_type = Column(String(50), nullable=False, default=FacilityTypeEnum.PHC.value)
    has_cemoc = Column(Boolean, default=False, nullable=False)
    admin_unit_id = Column(String(36), ForeignKey("admin_units.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(30), nullable=False, default=RoleEnum.ASHA.value)
    preferred_language = Column(String(10), default="en", nullable=False)
    facility_id = Column(String(36), ForeignKey("facilities.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    facility = relationship("Facility")

class AshaAssignment(Base):
    __tablename__ = "asha_assignments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    asha_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    village_id = Column(String(36), ForeignKey("admin_units.id"), nullable=False)
    facility_id = Column(String(36), ForeignKey("facilities.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
