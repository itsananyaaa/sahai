import os
import json
import pytest
from app.mvi.engine import mvi_scorer
from app.mvi.emergency import evaluate_emergency

def find_spec_path(filename: str) -> str:
    current = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        candidate = os.path.join(current, "packages", "mvi-spec", filename)
        if os.path.exists(candidate):
            return candidate
        current = os.path.dirname(current)
    raise FileNotFoundError(f"Could not locate spec file: {filename}")

with open(find_spec_path("golden-vectors.v1.json"), "r", encoding="utf-8") as f:
    GOLDEN_VECTORS = json.load(f)

@pytest.mark.parametrize("vector", GOLDEN_VECTORS, ids=[v["id"] for v in GOLDEN_VECTORS])
def test_mvi_python_parity(vector):
    inputs = vector["inputs"]
    expected = vector["expected"]
    
    # 1. Run MVI calculation
    result = mvi_scorer.calculate(inputs)
    
    assert abs(result.overall_score - expected["overall_score"]) < 0.05, (
        f"{vector['id']}: expected overall_score {expected['overall_score']}, got {result.overall_score}"
    )
    assert result.band == expected["band"], (
        f"{vector['id']}: expected band {expected['band']}, got {result.band}"
    )
    assert abs(result.completeness - expected["completeness"]) < 0.05, (
        f"{vector['id']}: expected completeness {expected['completeness']}, got {result.completeness}"
    )
    assert abs(result.lower_bound - expected["lower_bound"]) < 0.05, (
        f"{vector['id']}: expected lower_bound {expected['lower_bound']}, got {result.lower_bound}"
    )
    assert abs(result.upper_bound - expected["upper_bound"]) < 0.05, (
        f"{vector['id']}: expected upper_bound {expected['upper_bound']}, got {result.upper_bound}"
    )

    # 2. Run Emergency evaluation
    emergency_res = evaluate_emergency(
        danger_signs=vector.get("danger_signs", []),
        blood_pressure=inputs.get("blood_pressure")
    )
    expected_em = expected["emergency_result"]
    assert emergency_res.has_emergency == expected_em["has_emergency"]
    assert emergency_res.priority == expected_em["priority"]

def test_emergency_overrides_low_mvi():
    """
    Critical Clinical Precedence Rule:
    A beneficiary with a LOW MVI score who develops an acute danger sign (e.g. vaginal bleeding)
    must ALWAYS be escalated to Urgent facility transfer. Low MVI must NEVER suppress emergency escalation.
    """
    vec6 = next(v for v in GOLDEN_VECTORS if v["id"] == "VEC-06-URGENT-WITH-LOW-MVI")
    mvi_res = mvi_scorer.calculate(vec6["inputs"])
    em_res = evaluate_emergency(
        danger_signs=vec6["danger_signs"],
        blood_pressure=vec6["inputs"].get("blood_pressure")
    )
    
    assert mvi_res.overall_score == 0.0
    assert mvi_res.band == "lower"
    assert em_res.has_emergency is True
    assert em_res.priority == "Urgent"
    assert "vaginal_bleeding" in em_res.triggers_fired
