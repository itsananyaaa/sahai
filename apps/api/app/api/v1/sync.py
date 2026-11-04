from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.case import MaternalCase
from app.models.visit import Visit, Observation
from app.models.referral import Referral, ReferralEvent
from app.models.follow_up import FollowUp
from app.models.sync import SyncOperation, SyncConflict
from app.models.assessment import MviAssessment, EmergencyScreen
from app.schemas.sync import (
    SyncPushRequest, SyncPushResponse, OperationResult,
    SyncPullResponse, SyncConflictResponse
)
from app.core.rbac import get_current_user
from app.core.audit import record_audit_event
from app.api.v1.referrals import validate_referral_transition

router = APIRouter(prefix="/sync", tags=["Offline Sync Engine"])

@router.post("/push", response_model=SyncPushResponse)
def sync_push(
    req: SyncPushRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = []
    applied_count = 0
    failed_count = 0
    conflict_count = 0

    for op in req.operations:
        # 1. Idempotency Check: if operation_id already applied, return prior success
        existing_op = db.query(SyncOperation).filter(SyncOperation.operation_id == op.operation_id).first()
        if existing_op:
            results.append(OperationResult(
                operation_id=op.operation_id,
                entity=op.entity,
                entity_id=op.entity_id,
                status=existing_op.status,
                error=existing_op.error
            ))
            if existing_op.status == "applied":
                applied_count += 1
            continue

        op_status = "applied"
        op_error = None
        server_version = None

        try:
            # 2. Entity handling
            if op.entity == "case":
                payload = op.payload
                existing_case = db.query(MaternalCase).filter(MaternalCase.id == op.entity_id).first()
                if not existing_case:
                    # Create case
                    new_case = MaternalCase(
                        id=op.entity_id,
                        case_code=payload.get("case_code", f"SYN-{uuid.uuid4().hex[:4].upper()}"),
                        first_name=payload.get("first_name", "Unknown"),
                        age=payload.get("age", 25),
                        lmp_date=datetime.strptime(payload["lmp_date"], "%Y-%m-%d").date() if payload.get("lmp_date") else None,
                        edd_date=datetime.strptime(payload["edd_date"], "%Y-%m-%d").date() if payload.get("edd_date") else None,
                        gravida=payload.get("gravida", 1),
                        parity=payload.get("parity", 0),
                        prior_c_section=payload.get("prior_c_section", "no"),
                        birth_order=payload.get("birth_order", 1),
                        education_level=payload.get("education_level", "secondary"),
                        household_autonomy=payload.get("household_autonomy", "shared_decision"),
                        assigned_asha_id=current_user.id,
                        catchment_village=payload.get("catchment_village", "Default Village"),
                        nearest_facility_id=payload.get("nearest_facility_id") or current_user.facility_id,
                        consent_status=payload.get("consent_status", "given"),
                        status=payload.get("status", "active"),
                        created_by=current_user.id,
                        version=1
                    )
                    db.add(new_case)
                    server_version = 1
                else:
                    # Update case: 3-way merge
                    if existing_case.version != op.base_version:
                        # Overlapping change check
                        conflicts = {}
                        for k, v in payload.items():
                            if hasattr(existing_case, k) and getattr(existing_case, k) != v:
                                conflicts[k] = {"client": v, "server": getattr(existing_case, k)}
                        if conflicts:
                            op_status = "conflict_queued"
                            op_error = "Three-way merge conflict on demographics"
                            conflict_row = SyncConflict(
                                operation_id=op.operation_id,
                                entity="case",
                                entity_id=op.entity_id,
                                client_payload=payload,
                                server_payload={c: getattr(existing_case, c) for c in conflicts},
                                status="pending"
                            )
                            db.add(conflict_row)
                            conflict_count += 1
                        else:
                            # Non-conflicting: safe merge
                            existing_case.version += 1
                            server_version = existing_case.version
                    else:
                        for k, v in payload.items():
                            if hasattr(existing_case, k):
                                setattr(existing_case, k, v)
                        existing_case.version += 1
                        server_version = existing_case.version

            elif op.entity == "visit":
                # Visits are append-only; no overwrite
                payload = op.payload
                existing_visit = db.query(Visit).filter(Visit.id == op.entity_id).first()
                if not existing_visit:
                    new_visit = Visit(
                        id=op.entity_id,
                        case_id=payload["case_id"],
                        asha_id=current_user.id,
                        visit_number=payload.get("visit_number", 1),
                        visit_date=datetime.strptime(payload["visit_date"], "%Y-%m-%d").date() if payload.get("visit_date") else datetime.utcnow().date(),
                        notes=payload.get("notes"),
                        supersedes_visit_id=payload.get("supersedes_visit_id"),
                        created_by=current_user.id
                    )
                    db.add(new_visit)

            elif op.entity == "referral":
                payload = op.payload
                existing_ref = db.query(Referral).filter(Referral.id == op.entity_id).first()
                if not existing_ref:
                    new_ref = Referral(
                        id=op.entity_id,
                        case_id=payload["case_id"],
                        visit_id=payload.get("visit_id"),
                        reason_codes=payload.get("reason_codes", []),
                        priority=payload.get("priority", "Routine"),
                        receiving_facility_id=payload["receiving_facility_id"],
                        status=payload.get("status", "Pending"),
                        created_by=current_user.id,
                        version=1
                    )
                    db.add(new_ref)
                else:
                    target_status = payload.get("status")
                    if target_status and target_status != existing_ref.status:
                        if not validate_referral_transition(existing_ref.status, target_status):
                            op_status = "conflict_queued"
                            op_error = f"Invalid referral transition from {existing_ref.status} to {target_status}"
                            conflict_row = SyncConflict(
                                operation_id=op.operation_id,
                                entity="referral",
                                entity_id=op.entity_id,
                                client_payload=payload,
                                server_payload={"status": existing_ref.status, "version": existing_ref.version},
                                status="pending"
                            )
                            db.add(conflict_row)
                            conflict_count += 1
                        else:
                            old_status = existing_ref.status
                            existing_ref.status = target_status
                            existing_ref.version += 1
                            server_version = existing_ref.version
                            ev = ReferralEvent(
                                referral_id=existing_ref.id,
                                from_status=old_status,
                                to_status=target_status,
                                note="Synced from device",
                                actor_id=current_user.id,
                                actor_role=current_user.role
                            )
                            db.add(ev)

            # Record sync operation row for idempotency
            sync_op_row = SyncOperation(
                operation_id=op.operation_id,
                device_id=req.device_id,
                entity=op.entity,
                entity_id=op.entity_id,
                operation_type=op.operation_type,
                base_version=op.base_version,
                payload=op.payload,
                status=op_status,
                error=op_error
            )
            db.add(sync_op_row)
            db.commit()

            if op_status == "applied":
                applied_count += 1
            elif op_status == "failed":
                failed_count += 1

            results.append(OperationResult(
                operation_id=op.operation_id,
                entity=op.entity,
                entity_id=op.entity_id,
                status=op_status,
                error=op_error,
                server_version=server_version
            ))

        except Exception as e:
            db.rollback()
            failed_count += 1
            results.append(OperationResult(
                operation_id=op.operation_id,
                entity=op.entity,
                entity_id=op.entity_id,
                status="failed",
                error=str(e)
            ))

    record_audit_event(
        db=db,
        actor=current_user,
        action="SYNC_PUSH_PROCESSED",
        entity="sync",
        diff_summary={"applied": applied_count, "conflicts": conflict_count, "failed": failed_count},
        ip_address=request.client.host if request.client else None
    )

    return SyncPushResponse(
        applied_count=applied_count,
        failed_count=failed_count,
        conflict_count=conflict_count,
        results=results
    )

@router.get("/pull", response_model=SyncPullResponse)
def sync_pull(
    since: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    since_dt = since or datetime(1970, 1, 1)

    case_query = db.query(MaternalCase).filter(MaternalCase.updated_at >= since_dt, MaternalCase.deleted_at == None)
    if current_user.role == RoleEnum.ASHA.value:
        case_query = case_query.filter(MaternalCase.assigned_asha_id == current_user.id)
    elif current_user.role == RoleEnum.ANM_PHC.value and current_user.facility_id:
        case_query = case_query.filter(MaternalCase.nearest_facility_id == current_user.facility_id)

    cases = case_query.all()
    case_ids = [c.id for c in cases]

    visits = db.query(Visit).filter(Visit.case_id.in_(case_ids)).all() if case_ids else []
    assessments = db.query(MviAssessment).filter(MviAssessment.case_id.in_(case_ids)).all() if case_ids else []
    referrals = db.query(Referral).filter(Referral.case_id.in_(case_ids)).all() if case_ids else []
    follow_ups = db.query(FollowUp).filter(FollowUp.case_id.in_(case_ids)).all() if case_ids else []

    return SyncPullResponse(
        server_time=datetime.utcnow(),
        cases=[{"id": c.id, "case_code": c.case_code, "first_name": c.first_name, "age": c.age, "version": c.version, "status": c.status} for c in cases],
        visits=[{"id": v.id, "case_id": v.case_id, "visit_number": v.visit_number, "visit_date": str(v.visit_date)} for v in visits],
        assessments=[{"id": a.id, "case_id": a.case_id, "overall_score": a.overall_score, "band": a.band} for a in assessments],
        referrals=[{"id": r.id, "case_id": r.case_id, "priority": r.priority, "status": r.status, "version": r.version} for r in referrals],
        follow_ups=[{"id": f.id, "case_id": f.case_id, "due_date": str(f.due_date), "status": f.status, "version": f.version} for f in follow_ups]
    )

@router.get("/conflicts", response_model=List[SyncConflictResponse])
def get_sync_conflicts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(SyncConflict).filter(SyncConflict.status == "pending").order_by(SyncConflict.created_at.desc()).all()
