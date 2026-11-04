"""Reset only synthetic demo rows after an explicit confirmation."""

from __future__ import annotations

import os
import sys
from pathlib import Path

if os.getenv("SAHAI_DEMO_MODE", "").lower() != "true":
    raise SystemExit("Refusing reset: set SAHAI_DEMO_MODE=true first.")
if input("Type RESET DEMO to delete synthetic demo data: ") != "RESET DEMO":
    raise SystemExit("Reset cancelled.")

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps" / "api"
sys.path.insert(0, str(API))
os.chdir(API)

from app.database import SessionLocal  # noqa: E402
from app.models.case import MaternalCase  # noqa: E402
from app.models.referral import Referral  # noqa: E402
from app.models.user import User  # noqa: E402

db = SessionLocal()
try:
    db.query(Referral).filter(Referral.id.like("demo-%")).delete(synchronize_session=False)
    db.query(MaternalCase).filter(MaternalCase.id.like("demo-%")).delete(synchronize_session=False)
    db.query(User).filter(User.id.like("demo-%")).delete(synchronize_session=False)
    db.commit()
    print("Synthetic demo records reset. Facilities and admin units were retained.")
finally:
    db.close()
