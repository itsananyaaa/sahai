import os
import json
from typing import Dict, Any, List
from pydantic import BaseModel

def find_spec_path(filename: str) -> str:
    current = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        candidate = os.path.join(current, "packages", "mvi-spec", filename)
        if os.path.exists(candidate):
            return candidate
        current = os.path.dirname(current)
    raise FileNotFoundError(f"Could not locate spec file: {filename}")

SPEC_PATH = find_spec_path("emergency-rules.v1.json")

with open(SPEC_PATH, "r", encoding="utf-8") as f:
    EMERGENCY_RULES = json.load(f)

class EmergencyResult(BaseModel):
    has_emergency: bool
    triggers_fired: List[str]
    result: str # normal, urgent_referral
    action_shown: str
    priority: str # Urgent, Routine

def evaluate_emergency(
    danger_signs: List[str],
    blood_pressure: Dict[str, Any] = None
) -> EmergencyResult:
    triggers_fired = []
    
    # 1. Check danger signs list
    for ds in danger_signs:
        if ds and ds not in triggers_fired:
            triggers_fired.append(ds)

    # 2. Check severe hypertension reading
    if blood_pressure and isinstance(blood_pressure, dict):
        sys = blood_pressure.get("systolic")
        dia = blood_pressure.get("diastolic")
        if (sys is not None and sys >= 160) or (dia is not None and dia >= 110):
            if "severe_hypertension_reading" not in triggers_fired:
                triggers_fired.append("severe_hypertension_reading")

    has_emergency = len(triggers_fired) > 0

    return EmergencyResult(
        has_emergency=has_emergency,
        triggers_fired=triggers_fired,
        result="urgent_referral" if has_emergency else "normal",
        action_shown="action_immediate_facility_transfer" if has_emergency else "action_routine_follow_up",
        priority="Urgent" if has_emergency else "Routine"
    )
