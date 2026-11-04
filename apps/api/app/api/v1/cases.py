from typing import List, Optional
from datetime import date, datetime
import uuid
from fastapi import APIRouter, Depends, Query, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.case import MaternalCase, ConsentRecord
from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse, ConsentResponse
from app.core.rbac import get_current_user, verify_case_access
from app.core.audit import record_audit_event
from app.core.exceptions import SahaiException

router = APIRouter(prefix="/cases", tags=["Maternal Cases"])

def generate_case_code(db: Session) -> str:
    count = db.query(MaternalCase).count() + 1
    return f"SYN-{count:04d}"

def calculate_gestational_age(lmp: Optional[date]) -> Optional[float]:
    if not lmp:
        return None
    delta = (datetime.utcnow().date() - lmp).days
    weeks = round(delta / 7.0, 1)
    return max(0.0, min(weeks, 44.0))

@router.get("", response_model=List[CaseResponse])
def list_cases(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(MaternalCase).filter(MaternalCase.deleted_at == None)

    # Tenant & Catchment isolation
    if current_user.role == RoleEnum.ASHA.value:
        query = query.filter(MaternalCase.assigned_asha_id == current_user.id)
    elif current_user.role == RoleEnum.ANM_PHC.value:
        if current_user.facility_id:
            query = query.filter(MaternalCase.nearest_facility_id == current_user.facility_id)
    elif current_user.role == RoleEnum.DISTRICT_ADMIN.value:
        # District admins cannot browse identifiable patient lists
        raise SahaiException(
            status_code=403,
            code="DISTRICT_ADMIN_CASE_LIST_RESTRICTED",
            message="District administrators may only view de-identified aggregate analytics."
        )

    if status:
        query = query.filter(MaternalCase.status == status)
    if search:
        query = query.filter(
            (MaternalCase.case_code.ilike(f"%{search}%")) |
            (MaternalCase.first_name.ilike(f"%{search}%")) |
            (MaternalCase.catchment_village.ilike(f"%{search}%"))
        )

    return query.order_by(MaternalCase.updated_at.desc()).offset(offset).limit(limit).all()

@router.post("", response_model=CaseResponse)
def create_case(
    req: CaseCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.ASHA.value:
        raise SahaiException(
            status_code=403,
            code="ONLY_ASHA_CAN_REGISTER_CASE",
            message="Only ASHA workers can register new maternal cases."
        )

    # DPDP Rules 2025: Guardian consent required for beneficiaries under 18
    consent_status = "given"
    if req.age < 18:
        if not req.consent or not req.consent.guardian_consent_given or not req.consent.guardian_name:
            raise SahaiException(
                status_code=422,
                code="GUARDIAN_CONSENT_REQUIRED",
                message="Under DPDP Rules, verifiable parental/guardian consent is mandatory for beneficiaries under 18 years of age."
            )
        consent_status = "guardian_verified"

    case_id = req.id or str(uuid.uuid4())
    case_code = req.case_code or generate_case_code(db)
    ga_weeks = calculate_gestational_age(req.lmp_date)

    new_case = MaternalCase(
        id=case_id,
        case_code=case_code,
        first_name=req.first_name,
        age=req.age,
        lmp_date=req.lmp_date,
        edd_date=req.edd_date,
        gestational_age_weeks=ga_weeks,
        gravida=req.gravida,
        parity=req.parity,
        prior_c_section=req.prior_c_section,
        birth_order=req.birth_order,
        education_level=req.education_level,
        household_autonomy=req.household_autonomy,
        assigned_asha_id=current_user.id,
        catchment_village=req.catchment_village,
        nearest_facility_id=req.nearest_facility_id or current_user.facility_id,
        consent_status=consent_status,
        status="active",
        created_by=current_user.id,
        version=1
    )

    db.add(new_case)
    db.flush()

    # Record consent log
    if req.consent:
        consent = ConsentRecord(
            case_id=new_case.id,
            purpose=req.consent.purpose,
            notice_version=req.consent.notice_version,
            language=req.consent.language,
            status=req.consent.status,
            recorded_by=current_user.id,
            guardian_name=req.consent.guardian_name,
            guardian_relation=req.consent.guardian_relation,
            guardian_consent_given=req.consent.guardian_consent_given
        )
        db.add(consent)

    db.commit()
    db.refresh(new_case)

    record_audit_event(
        db=db,
        actor=current_user,
        action="CASE_REGISTERED",
        entity="case",
        entity_id=new_case.id,
        diff_summary={"case_code": case_code, "age": req.age, "consent": consent_status},
        ip_address=request.client.host if request.client else None
    )

    return new_case

@router.get("/{id}", response_model=CaseResponse)
def get_case(id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    case = db.query(MaternalCase).filter(MaternalCase.id == id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")
    
    verify_case_access(case, current_user)
    return case

@router.patch("/{id}", response_model=CaseResponse)
def update_case(
    id: str,
    req: CaseUpdate,
    request: Request,
    if_match: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(MaternalCase).filter(MaternalCase.id == id, MaternalCase.deleted_at == None).first()
    if not case:
        raise SahaiException(status_code=404, code="CASE_NOT_FOUND", message="Maternal case not found.")

    verify_case_access(case, current_user)

    # Optimistic concurrency check
    expected_version = int(if_match) if if_match else req.version
    if case.version != expected_version:
        raise SahaiException(
            status_code=409,
            code="CONCURRENCY_CONFLICT",
            message=f"Record has been modified elsewhere. Expected version {expected_version}, current {case.version}.",
            details={"current_version": case.version}
        )

    update_data = req.model_dump(exclude_unset=True, exclude={"version"})
    if "lmp_date" in update_data:
        update_data["gestational_age_weeks"] = calculate_gestational_age(update_data["lmp_date"])

    diff = {}
    for key, value in update_data.items():
        old_val = getattr(case, key)
        if old_val != value:
            diff[key] = {"old": str(old_val), "new": str(value)}
            setattr(case, key, value)

    case.version += 1
    case.updated_by = current_user.id
    case.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(case)

    record_audit_event(
        db=db,
        actor=current_user,
        action="CASE_UPDATED",
        entity="case",
        entity_id=case.id,
        diff_summary=diff,
        ip_address=request.client.host if request.client else None
    )

    return case
