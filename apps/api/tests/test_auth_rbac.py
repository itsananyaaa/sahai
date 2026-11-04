import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.user import User, RoleEnum, Facility, AdminUnit
from app.models.case import MaternalCase, ConsentRecord
from app.models.referral import Referral
from app.core.security import hash_password, create_access_token
from app.api.v1.referrals import validate_referral_transition

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clean test tables
    db.query(Referral).delete()
    db.query(ConsentRecord).delete()
    db.query(MaternalCase).delete()
    db.query(User).delete()
    db.query(Facility).delete()
    db.query(AdminUnit).delete()

    # Create test admin unit & facilities
    unit = AdminUnit(id="unit-1", name="Demo District", level="district")
    db.add(unit)
    
    fac1 = Facility(id="fac-phc-alpha", name="PHC Alpha", facility_type="Primary Health Centre (PHC)", has_cemoc=True, admin_unit_id="unit-1")
    fac2 = Facility(id="fac-phc-beta", name="PHC Beta", facility_type="Primary Health Centre (PHC)", has_cemoc=False, admin_unit_id="unit-1")
    db.add_all([fac1, fac2])

    # Create users
    asha1 = User(
        id="user-asha-1",
        email="asha1@sahai.demo",
        hashed_password=hash_password("demo1234"),
        full_name="ASHA Sarala",
        role=RoleEnum.ASHA.value,
        preferred_language="ml",
        facility_id="fac-phc-alpha"
    )
    asha2 = User(
        id="user-asha-2",
        email="asha2@sahai.demo",
        hashed_password=hash_password("demo1234"),
        full_name="ASHA Mary",
        role=RoleEnum.ASHA.value,
        preferred_language="en",
        facility_id="fac-phc-beta"
    )
    anm = User(
        id="user-anm-1",
        email="anm@sahai.demo",
        hashed_password=hash_password("demo1234"),
        full_name="ANM Priya",
        role=RoleEnum.ANM_PHC.value,
        preferred_language="en",
        facility_id="fac-phc-alpha"
    )
    admin = User(
        id="user-admin-1",
        email="admin@sahai.demo",
        hashed_password=hash_password("demo1234"),
        full_name="District Officer Rajesh",
        role=RoleEnum.DISTRICT_ADMIN.value,
        preferred_language="hi"
    )
    db.add_all([asha1, asha2, anm, admin])
    db.commit()

    # Create cases
    case1 = MaternalCase(
        id="case-1",
        case_code="SYN-0001",
        first_name="Anitha",
        age=24,
        assigned_asha_id="user-asha-1",
        catchment_village="Village Alpha",
        nearest_facility_id="fac-phc-alpha",
        consent_status="given",
        status="active",
        created_by="user-asha-1",
        version=1
    )
    case2 = MaternalCase(
        id="case-2",
        case_code="SYN-0002",
        first_name="Sunitha",
        age=26,
        assigned_asha_id="user-asha-2",
        catchment_village="Village Beta",
        nearest_facility_id="fac-phc-beta",
        consent_status="given",
        status="active",
        created_by="user-asha-2",
        version=1
    )
    db.add_all([case1, case2])
    db.commit()

    # Create test referral
    ref1 = Referral(
        id="ref-1",
        case_id="case-1",
        reason_codes=["elevated_bp"],
        priority="Priority",
        receiving_facility_id="fac-phc-alpha",
        status="Pending",
        created_by="user-asha-1",
        version=1
    )
    db.add(ref1)
    db.commit()
    db.close()

def test_login_success():
    resp = client.post("/api/v1/auth/login", json={"email": "asha1@sahai.demo", "password": "demo1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("access_token") is None
    assert data["user"]["role"] == "asha"
    assert "sahai_access_token" in resp.cookies

def test_login_invalid_password():
    resp = client.post("/api/v1/auth/login", json={"email": "asha1@sahai.demo", "password": "wrongpassword"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"

def test_idor_asha_cannot_access_other_asha_case():
    token = create_access_token({"sub": "user-asha-1", "role": "asha"})
    headers = {"Authorization": f"Bearer {token}"}
    # asha1 attempts to access case2 (assigned to asha2)
    resp = client.get("/api/v1/cases/case-2", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "CASE_ACCESS_DENIED"

def test_district_admin_cannot_browse_identifiable_case():
    token = create_access_token({"sub": "user-admin-1", "role": "district_admin"})
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/cases/case-1", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "DISTRICT_ADMIN_CASE_ACCESS_RESTRICTED"

def test_anm_can_acknowledge_referral_but_asha_cannot():
    asha_token = create_access_token({"sub": "user-asha-1", "role": "asha"})
    anm_token = create_access_token({"sub": "user-anm-1", "role": "anm_phc"})

    # ASHA tries to acknowledge -> Forbidden
    resp = client.post(
        "/api/v1/referrals/ref-1/transition",
        headers={"Authorization": f"Bearer {asha_token}"},
        json={"to_status": "Acknowledged", "version": 1}
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ONLY_CLINICIAN_CAN_ACKNOWLEDGE_OR_COMPLETE"

    # ANM acknowledges -> Success
    resp = client.post(
        "/api/v1/referrals/ref-1/transition",
        headers={"Authorization": f"Bearer {anm_token}"},
        json={"to_status": "Acknowledged", "version": 1}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "Acknowledged"

def test_referral_transition_state_machine():
    assert validate_referral_transition("Draft", "Pending") is True
    assert validate_referral_transition("Pending", "Acknowledged") is True
    assert validate_referral_transition("Acknowledged", "In Progress") is True
    assert validate_referral_transition("In Progress", "Completed") is True
    assert validate_referral_transition("Completed", "Pending") is False # No backwards moves
    assert validate_referral_transition("Pending", "Completed") is False # Must acknowledge first

def test_dpdp_guardian_consent_required_for_minor():
    token = create_access_token({"sub": "user-asha-1", "role": "asha"})
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to register minor without guardian consent -> 422
    minor_req = {
        "first_name": "Meena",
        "age": 16, # Minor (<18)
        "catchment_village": "Village Alpha",
        "consent": {
            "guardian_consent_given": False
        }
    }
    resp = client.post("/api/v1/cases", json=minor_req, headers=headers)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "GUARDIAN_CONSENT_REQUIRED"

def test_analytics_small_cell_masking():
    token = create_access_token({"sub": "user-admin-1", "role": "district_admin"})
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/analytics/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data
    # In test DB, count of cases is 2 (<5), so small-cell masking returns "<5"
    reg_metric = next(m for m in data["metrics"] if m["key"] == "registered_cases")
    assert reg_metric["value"] == "<5"

def test_asha_cannot_view_district_analytics():
    token = create_access_token({"sub": "user-asha-1", "role": "asha"})
    resp = client.get(
        "/api/v1/analytics/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN_ROLE"
