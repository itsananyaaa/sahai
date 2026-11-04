"""Create deterministic synthetic demo records. Never runs automatically."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps" / "api"
sys.path.insert(0, str(API))
os.chdir(API)

subprocess.run(
    [sys.executable, "-m", "alembic", "upgrade", "head"],
    cwd=API,
    check=True,
)

from app.core.security import hash_password  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.case import MaternalCase  # noqa: E402
from app.models.referral import Referral  # noqa: E402
from app.models.user import AdminUnit, Facility, RoleEnum, User  # noqa: E402


def get_or_create(session, model, lookup: dict, values: dict):
    record = session.query(model).filter_by(**lookup).first()
    if record:
        return record
    record = model(**lookup, **values)
    session.add(record)
    session.flush()
    return record


def main() -> None:
    db = SessionLocal()
    try:
        district = get_or_create(
            db, AdminUnit, {"id": "demo-district"}, {"name": "Demo District", "level": "district"}
        )
        phc = get_or_create(
            db,
            Facility,
            {"id": "demo-phc-alpha"},
            {
                "name": "PHC Alpha",
                "facility_type": "Primary Health Centre (PHC)",
                "has_cemoc": True,
                "admin_unit_id": district.id,
            },
        )
        get_or_create(
            db,
            Facility,
            {"id": "demo-phc-beta"},
            {
                "name": "PHC Beta",
                "facility_type": "Primary Health Centre (PHC)",
                "has_cemoc": False,
                "admin_unit_id": district.id,
            },
        )

        users = {
            "demo-asha": ("asha.sarala@sahai.demo", "Sarala ASHA", RoleEnum.ASHA.value, "ml"),
            "demo-anm": ("anm.priya@sahai.demo", "Priya ANM / PHC", RoleEnum.ANM_PHC.value, "en"),
            "demo-admin": ("admin.rajesh@sahai.demo", "Rajesh District Admin", RoleEnum.DISTRICT_ADMIN.value, "hi"),
        }
        user_records = {}
        for user_id, (email, name, role, language) in users.items():
            record = db.query(User).filter((User.id == user_id) | (User.email == email)).first()
            if not record:
                record = User(
                    id=user_id,
                    email=email,
                    hashed_password=hash_password("demo1234"),
                    full_name=name,
                    role=role,
                    preferred_language=language,
                    facility_id=phc.id if role != RoleEnum.DISTRICT_ADMIN.value else None,
                    is_active=True,
                )
                db.add(record)
                db.flush()
            user_records[role] = record

        asha = user_records[RoleEnum.ASHA.value]
        case = db.query(MaternalCase).filter(
            (MaternalCase.id == "demo-case-0001") | (MaternalCase.case_code == "SYN-0001")
        ).first()
        if not case:
            case = MaternalCase(
                id="demo-case-0001",
                case_code="SYN-0001",
                first_name="Anitha",
                age=24,
                gravida=1,
                parity=0,
                prior_c_section="no",
                birth_order=1,
                education_level="secondary",
                household_autonomy="shared_decision",
                assigned_asha_id=asha.id,
                catchment_village="Village Alpha",
                nearest_facility_id=phc.id,
                consent_status="given",
                status="active",
                created_by=asha.id,
            )
            db.add(case)
            db.flush()
        get_or_create(
            db,
            Referral,
            {"id": "demo-referral-0001"},
            {
                "case_id": case.id,
                "reason_codes": ["follow_up_review"],
                "priority": "Priority",
                "receiving_facility_id": phc.id,
                "status": "Pending",
                "created_by": asha.id,
            },
        )
        db.commit()
        print("Seeded synthetic demo data. Demo password: demo1234")
    finally:
        db.close()


if __name__ == "__main__":
    main()
