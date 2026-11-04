from typing import List, Optional
from datetime import datetime, date
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.case import MaternalCase
from app.models.follow_up import FollowUp
from app.schemas.follow_up import FollowUpCreate, FollowUpUpdate, FollowUpResponse
from app.core.rbac import get_current_user, verify_case_access
from app.core.audit import record_audit_event
from app.core.exceptions import SahaiException

router = APIRouter(prefix="/follow-ups", tags=["Follow-ups"])

@router.post("", response_model=FollowUpResponse)
def create_follow_up(
    req: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(MaternalCase).filter(MaternalCase.id == req.case_id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")
    verify_case_access(case, current_user)

    follow_up = FollowUp(
        id=req.id or str(uuid.uuid4()),
        case_id=case.id,
        asha_id=case.assigned_asha_id,
        due_date=req.due_date,
        type=req.type,
        status="Pending",
        notes=req.notes,
        created_by=current_user.id,
        version=1
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up

@router.get("", response_model=List[FollowUpResponse])
def list_follow_ups(
    status: Optional[str] = None,
    case_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FollowUp)

    if current_user.role == RoleEnum.ASHA.value:
        query = query.filter(FollowUp.asha_id == current_user.id)
    elif current_user.role == RoleEnum.ANM_PHC.value:
        if current_user.facility_id:
            query = query.join(MaternalCase).filter(MaternalCase.nearest_facility_id == current_user.facility_id)

    if status:
        query = query.filter(FollowUp.status == status)
    if case_id:
        query = query.filter(FollowUp.case_id == case_id)

    return query.order_by(FollowUp.due_date.asc()).all()

@router.patch("/{id}", response_model=FollowUpResponse)
def update_follow_up(
    id: str,
    req: FollowUpUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fu = db.query(FollowUp).filter(FollowUp.id == id).first()
    if not fu:
        raise SahaiException(status_code=404, code="FOLLOW_UP_NOT_FOUND", message="Follow-up not found.")
    verify_case_access(fu.maternal_case, current_user)

    if fu.version != req.version:
        raise SahaiException(
            status_code=409,
            code="CONCURRENCY_CONFLICT",
            message=f"Follow-up has been modified. Expected version {req.version}, current {fu.version}."
        )

    # Validation: Reschedule cannot be in the past
    if req.rescheduled_to:
        if req.rescheduled_to < datetime.utcnow().date():
            raise SahaiException(
                status_code=422,
                code="PAST_RESCHEDULE_DATE",
                message="Follow-up cannot be rescheduled to a date in the past."
            )
        if not req.reschedule_reason:
            raise SahaiException(
                status_code=422,
                code="RESCHEDULE_REASON_REQUIRED",
                message="A reason must be provided when rescheduling a follow-up visit."
            )
        fu.rescheduled_from = fu.due_date
        fu.due_date = req.rescheduled_to
        fu.status = "Rescheduled"
        fu.notes = f"Rescheduled: {req.reschedule_reason}. {fu.notes or ''}"

    if req.status == "Completed":
        fu.status = "Completed"
        fu.completed_at = datetime.utcnow()
        if req.outcome:
            fu.outcome = req.outcome

    if req.notes and not req.rescheduled_to:
        fu.notes = req.notes

    fu.version += 1
    fu.updated_by = current_user.id
    fu.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(fu)

    record_audit_event(
        db=db,
        actor=current_user,
        action="FOLLOW_UP_UPDATED",
        entity="follow_up",
        entity_id=fu.id,
        diff_summary={"status": fu.status, "due_date": str(fu.due_date)},
        ip_address=request.client.host if request.client else None
    )

    return fu
