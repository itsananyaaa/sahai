from typing import List, Optional
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.case import MaternalCase
from app.models.visit import Visit, Observation, Draft
from app.models.assessment import MviAssessment, EmergencyScreen
from app.schemas.visit import VisitCreate, VisitResponse, DraftCreate, DraftResponse
from app.core.rbac import get_current_user, verify_case_access
from app.core.audit import record_audit_event
from app.core.exceptions import SahaiException
from app.mvi.engine import mvi_scorer
from app.mvi.emergency import evaluate_emergency

router = APIRouter(prefix="/visits", tags=["Home Visits"])

@router.post("", response_model=VisitResponse)
def create_visit(
    req: VisitCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ASHA.value:
        raise SahaiException(
            status_code=403,
            code="ONLY_ASHA_CAN_RECORD_VISIT",
            message="Only assigned ASHA workers can record home visit observations."
        )

    case = db.query(MaternalCase).filter(MaternalCase.id == req.case_id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")

    verify_case_access(case, current_user)

    visit_id = req.id or str(uuid.uuid4())
    new_visit = Visit(
        id=visit_id,
        case_id=case.id,
        asha_id=current_user.id,
        visit_number=req.visit_number,
        visit_date=req.visit_date or datetime.utcnow().date(),
        notes=req.notes,
        supersedes_visit_id=req.supersedes_visit_id,
        created_by=current_user.id
    )
    db.add(new_visit)
    db.flush()

    # Add observations
    bp_dict = {}
    for obs in req.observations:
        obs_row = Observation(
            id=obs.id or str(uuid.uuid4()),
            visit_id=new_visit.id,
            observation_type=obs.observation_type,
            value_numeric=obs.value_numeric,
            value_text=obs.value_text,
            status=obs.status,
            recorded_at=datetime.utcnow()
        )
        db.add(obs_row)
        if obs.observation_type == "bp_systolic" and obs.value_numeric is not None:
            bp_dict["systolic"] = obs.value_numeric
        elif obs.observation_type == "bp_diastolic" and obs.value_numeric is not None:
            bp_dict["diastolic"] = obs.value_numeric

    # 1. Run Emergency Screen (Always runs and cannot be suppressed)
    em_res = evaluate_emergency(danger_signs=req.danger_signs, blood_pressure=bp_dict)
    emergency_row = EmergencyScreen(
        case_id=case.id,
        visit_id=new_visit.id,
        rule_version="1.0.0",
        has_emergency=em_res.has_emergency,
        triggers_fired=em_res.triggers_fired,
        result=em_res.result,
        action_shown=em_res.action_shown
    )
    db.add(emergency_row)

    # 2. Run MVI Assessment
    mvi_inputs = req.mvi_inputs or {}
    if bp_dict and "blood_pressure" not in mvi_inputs:
        mvi_inputs["blood_pressure"] = bp_dict

    mvi_res = mvi_scorer.calculate(mvi_inputs)
    assessment_row = MviAssessment(
        case_id=case.id,
        visit_id=new_visit.id,
        config_version=mvi_res.explanation.get("config_version", "1.0.0"),
        inputs_snapshot=mvi_inputs,
        clinical_score=mvi_res.domain_scores.get("clinical"),
        social_score=mvi_res.domain_scores.get("social"),
        accessibility_score=mvi_res.domain_scores.get("accessibility"),
        environmental_score=mvi_res.domain_scores.get("environmental"),
        overall_score=mvi_res.overall_score,
        completeness=mvi_res.completeness,
        lower_bound=mvi_res.lower_bound,
        upper_bound=mvi_res.upper_bound,
        band=mvi_res.band,
        explanation=mvi_res.explanation,
        computed_on="server",
        parity_ok=True
    )
    db.add(assessment_row)

    db.commit()
    db.refresh(new_visit)

    record_audit_event(
        db=db,
        actor=current_user,
        action="VISIT_RECORDED",
        entity="visit",
        entity_id=new_visit.id,
        diff_summary={
            "case_id": case.id,
            "visit_num": req.visit_number,
            "has_emergency": em_res.has_emergency,
            "mvi_band": mvi_res.band
        },
        ip_address=request.client.host if request.client else None
    )

    return new_visit

@router.get("/case/{case_id}", response_model=List[VisitResponse])
def list_visits_for_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(MaternalCase).filter(MaternalCase.id == case_id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")
    verify_case_access(case, current_user)

    return db.query(Visit).filter(Visit.case_id == case_id).order_by(Visit.visit_date.desc()).all()

# Draft Endpoints
@router.post("/drafts", response_model=DraftResponse)
def save_draft(
    req: DraftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    draft = db.query(Draft).filter(
        Draft.user_id == current_user.id,
        Draft.entity_type == req.entity_type,
        Draft.entity_id == req.entity_id
    ).first()

    if draft:
        draft.payload = req.payload
        draft.updated_at = datetime.utcnow()
    else:
        draft = Draft(
            id=req.id or str(uuid.uuid4()),
            user_id=current_user.id,
            entity_type=req.entity_type,
            entity_id=req.entity_id,
            payload=req.payload
        )
        db.add(draft)

    db.commit()
    db.refresh(draft)
    return draft

@router.get("/drafts/{entity_type}", response_model=List[DraftResponse])
def get_user_drafts(
    entity_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Draft).filter(
        Draft.user_id == current_user.id,
        Draft.entity_type == entity_type
    ).all()
