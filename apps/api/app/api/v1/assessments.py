from typing import List, Optional
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.case import MaternalCase
from app.models.assessment import MviAssessment, EmergencyScreen
from app.schemas.assessment import AssessmentCreate, AssessmentResponse, EmergencyResponse
from app.core.rbac import get_current_user, verify_case_access
from app.core.audit import record_audit_event
from app.core.exceptions import SahaiException
from app.mvi.engine import mvi_scorer

router = APIRouter(prefix="/assessments", tags=["Assessments"])

@router.post("/cases/{case_id}", response_model=AssessmentResponse)
def compute_and_store_assessment(
    case_id: str,
    req: AssessmentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(MaternalCase).filter(MaternalCase.id == case_id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")
    verify_case_access(case, current_user)

    # Calculate authoritative server score
    res = mvi_scorer.calculate(req.inputs)

    # Check parity if client provided its own score
    parity_ok = True
    if req.client_score is not None:
        if abs(req.client_score - res.overall_score) > 0.05:
            parity_ok = False
            record_audit_event(
                db=db,
                actor=current_user,
                action="MVI_PARITY_MISMATCH",
                entity="assessment",
                entity_id=case_id,
                diff_summary={"client_score": req.client_score, "server_score": res.overall_score},
                ip_address=request.client.host if request.client else None
            )

    assessment = MviAssessment(
        id=req.id or str(uuid.uuid4()),
        case_id=case.id,
        visit_id=req.visit_id,
        config_version=res.explanation.get("config_version", "1.0.0"),
        inputs_snapshot=req.inputs,
        clinical_score=res.domain_scores.get("clinical"),
        social_score=res.domain_scores.get("social"),
        accessibility_score=res.domain_scores.get("accessibility"),
        environmental_score=res.domain_scores.get("environmental"),
        overall_score=res.overall_score,
        completeness=res.completeness,
        lower_bound=res.lower_bound,
        upper_bound=res.upper_bound,
        band=res.band,
        explanation=res.explanation,
        computed_on="server",
        parity_ok=parity_ok
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return assessment

@router.get("/cases/{case_id}", response_model=List[AssessmentResponse])
def get_case_assessments(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(MaternalCase).filter(MaternalCase.id == case_id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")
    verify_case_access(case, current_user)

    return db.query(MviAssessment).filter(MviAssessment.case_id == case_id).order_by(MviAssessment.created_at.desc()).all()

@router.get("/cases/{case_id}/emergency", response_model=Optional[EmergencyResponse])
def get_latest_emergency_screen(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(MaternalCase).filter(MaternalCase.id == case_id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")
    verify_case_access(case, current_user)

    return db.query(EmergencyScreen).filter(EmergencyScreen.case_id == case_id).order_by(EmergencyScreen.created_at.desc()).first()
