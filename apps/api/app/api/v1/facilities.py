from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import Facility, AdminUnit
from app.models.user import User
from app.core.rbac import get_current_user

router = APIRouter(prefix="/facilities", tags=["Facilities & Catchments"])

@router.get("")
def list_facilities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    facilities = db.query(Facility).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "facility_type": f.facility_type,
            "has_cemoc": f.has_cemoc,
            "admin_unit_id": f.admin_unit_id
        }
        for f in facilities
    ]

@router.get("/admin-units")
def list_admin_units(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    units = db.query(AdminUnit).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "level": u.level,
            "parent_id": u.parent_id
        }
        for u in units
    ]
