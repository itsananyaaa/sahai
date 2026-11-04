from typing import List, Optional
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.case import MaternalCase
from app.models.referral import Referral, ReferralEvent, ClinicalNote
from app.schemas.referral import (
    ReferralCreate, ReferralTransition, ReferralResponse,
    ClinicalNoteCreate, ClinicalNoteResponse
)
from app.core.rbac import get_current_user, verify_case_access
from app.core.audit import record_audit_event
from app.core.exceptions import SahaiException

router = APIRouter(prefix="/referrals", tags=["Referrals"])

ALLOWED_TRANSITIONS = {
    "Draft": ["Pending", "Cancelled"],
    "Pending": ["Acknowledged", "Cancelled"],
    "Acknowledged": ["In Progress", "Completed", "Cancelled"],
    "In Progress": ["Completed", "Cancelled"],
    "Completed": [],
    "Cancelled": []
}

def validate_referral_transition(current_status: str, target_status: str) -> bool:
    """Pure state machine validator for referral status transitions."""
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    return target_status in allowed

@router.post("", response_model=ReferralResponse)
def create_referral(
    req: ReferralCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ASHA.value:
        raise SahaiException(
            status_code=403,
            code="ONLY_ASHA_CAN_CREATE_REFERRAL",
            message="Only ASHA workers can initiate case referrals."
        )

    case = db.query(MaternalCase).filter(MaternalCase.id == req.case_id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")
    verify_case_access(case, current_user)

    referral_id = req.id or str(uuid.uuid4())
    new_referral = Referral(
        id=referral_id,
        case_id=case.id,
        visit_id=req.visit_id,
        reason_codes=req.reason_codes,
        priority=req.priority,
        priority_override_reason=req.priority_override_reason,
        receiving_facility_id=req.receiving_facility_id,
        status="Pending",
        appointment_date=req.appointment_date,
        transport_status=req.transport_status,
        created_by=current_user.id,
        version=1
    )
    db.add(new_referral)
    db.flush()

    # Initial event
    event = ReferralEvent(
        referral_id=new_referral.id,
        from_status="Draft",
        to_status="Pending",
        note="Referral initiated by ASHA",
        actor_id=current_user.id,
        actor_role=current_user.role
    )
    db.add(event)
    db.commit()
    db.refresh(new_referral)

    record_audit_event(
        db=db,
        actor=current_user,
        action="REFERRAL_CREATED",
        entity="referral",
        entity_id=new_referral.id,
        diff_summary={"case_id": case.id, "priority": req.priority, "to_status": "Pending"},
        ip_address=request.client.host if request.client else None
    )

    return new_referral

@router.get("", response_model=List[ReferralResponse])
def list_referrals(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Referral)

    if current_user.role == RoleEnum.ASHA.value:
        # Referrals for ASHA's assigned cases
        query = query.join(MaternalCase).filter(MaternalCase.assigned_asha_id == current_user.id)
    elif current_user.role == RoleEnum.ANM_PHC.value:
        # PHC inbox: Referrals addressed to clinician's facility
        if current_user.facility_id:
            query = query.filter(Referral.receiving_facility_id == current_user.facility_id)
    elif current_user.role == RoleEnum.DISTRICT_ADMIN.value:
        raise SahaiException(
            status_code=403,
            code="DISTRICT_ADMIN_REFERRAL_LIST_RESTRICTED",
            message="District administrators may only view aggregate referral metrics."
        )

    if status:
        query = query.filter(Referral.status == status)
    if priority:
        query = query.filter(Referral.priority == priority)

    return query.order_by(Referral.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{id}", response_model=ReferralResponse)
def get_referral(id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    referral = db.query(Referral).filter(Referral.id == id).first()
    if not referral:
        raise SahaiException(status_code=404, code="REFERRAL_NOT_FOUND", message="Referral not found.")
    
    verify_case_access(referral.maternal_case, current_user)
    return referral

@router.post("/{id}/transition", response_model=ReferralResponse)
def transition_referral(
    id: str,
    req: ReferralTransition,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    referral = db.query(Referral).filter(Referral.id == id).first()
    if not referral:
        raise SahaiException(status_code=404, code="REFERRAL_NOT_FOUND", message="Referral not found.")

    verify_case_access(referral.maternal_case, current_user)

    # Concurrency check
    if referral.version != req.version:
        raise SahaiException(
            status_code=409,
            code="CONCURRENCY_CONFLICT",
            message=f"Referral has been modified. Expected version {req.version}, current {referral.version}.",
            details={"current_version": referral.version}
        )

    # Validate state transition
    if not validate_referral_transition(referral.status, req.to_status):
        raise SahaiException(
            status_code=422,
            code="INVALID_STATUS_TRANSITION",
            message=f"Illegal transition from '{referral.status}' to '{req.to_status}'. Allowed: {ALLOWED_TRANSITIONS.get(referral.status, [])}"
        )

    # Role guardrail: ASHA cannot acknowledge or complete referrals; ANM/PHC does
    if req.to_status in ["Acknowledged", "In Progress", "Completed"] and current_user.role != RoleEnum.ANM_PHC.value:
        raise SahaiException(
            status_code=403,
            code="ONLY_CLINICIAN_CAN_ACKNOWLEDGE_OR_COMPLETE",
            message="Only PHC clinicians/ANMs can acknowledge or complete referrals."
        )

    old_status = referral.status
    referral.status = req.to_status
    referral.version += 1
    referral.updated_by = current_user.id
    referral.updated_at = datetime.utcnow()

    if req.to_status == "Acknowledged":
        referral.acknowledged_by = current_user.id
        referral.acknowledged_at = datetime.utcnow()
    elif req.to_status == "Completed" and req.outcome:
        referral.outcome = req.outcome
    elif req.to_status == "Cancelled":
        referral.cancellation_reason = req.cancellation_reason or req.note

    # Add immutable transition event
    event = ReferralEvent(
        referral_id=referral.id,
        from_status=old_status,
        to_status=req.to_status,
        note=req.note or req.cancellation_reason or req.outcome,
        actor_id=current_user.id,
        actor_role=current_user.role
    )
    db.add(event)
    db.commit()
    db.refresh(referral)

    record_audit_event(
        db=db,
        actor=current_user,
        action="REFERRAL_TRANSITIONED",
        entity="referral",
        entity_id=referral.id,
        diff_summary={"from": old_status, "to": req.to_status},
        ip_address=request.client.host if request.client else None
    )

    return referral

@router.post("/{id}/notes", response_model=ClinicalNoteResponse)
def add_clinical_note(
    id: str,
    req: ClinicalNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    referral = db.query(Referral).filter(Referral.id == id).first()
    if not referral:
        raise SahaiException(status_code=404, code="REFERRAL_NOT_FOUND", message="Referral not found.")
    verify_case_access(referral.maternal_case, current_user)

    note = ClinicalNote(
        case_id=referral.case_id,
        referral_id=referral.id,
        author_id=current_user.id,
        author_role=current_user.role,
        text=req.text,
        visibility=req.visibility,
        original_language=req.original_language
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
