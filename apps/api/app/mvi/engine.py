import os
import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

def find_spec_path(filename: str) -> str:
    # Look from current file up to repo root
    current = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        candidate = os.path.join(current, "packages", "mvi-spec", filename)
        if os.path.exists(candidate):
            return candidate
        current = os.path.dirname(current)
    raise FileNotFoundError(f"Could not locate spec file: {filename}")

SPEC_PATH = find_spec_path("scoring-config.v1.json")

with open(SPEC_PATH, "r", encoding="utf-8") as f:
    CONFIG = json.load(f)

class FactorResult(BaseModel):
    bin: str
    score: float

class MviAssessmentResult(BaseModel):
    overall_score: float
    completeness: float
    lower_bound: float
    upper_bound: float
    band: str
    domain_scores: Dict[str, Optional[float]]
    missing_factors: List[str]
    top_contributing_factors: List[Dict[str, Any]]
    explanation: Dict[str, Any]

class RuleBasedScorer:
    def __init__(self, config: Dict[str, Any] = CONFIG):
        self.config = config

    def score_factor(self, domain: str, factor_name: str, val: Any) -> Optional[FactorResult]:
        if val is None or val == "unknown" or val == "not_assessed":
            return None

        if factor_name == "blood_pressure":
            if not isinstance(val, dict):
                return None
            sys = val.get("systolic")
            dia = val.get("diastolic")
            if sys is None or dia is None:
                return None
            if sys >= 160 or dia >= 110:
                return FactorResult(bin="severe_hypertension", score=100.0)
            if sys >= 140 or dia >= 90:
                return FactorResult(bin="stage1_hypertension", score=75.0)
            if sys >= 120 or dia >= 80:
                return FactorResult(bin="elevated", score=40.0)
            return FactorResult(bin="normal", score=0.0)

        elif factor_name == "bp_trend":
            mapping = {"stable_normal": 0.0, "fluctuating": 40.0, "rising_trend": 70.0}
            if val in mapping:
                return FactorResult(bin=str(val), score=mapping[val])
            return None

        elif factor_name == "anaemia":
            if isinstance(val, dict):
                hb = val.get("hb")
                pallor = val.get("pallor")
                if hb is not None:
                    hb_f = float(hb)
                    if hb_f < 7.0:
                        return FactorResult(bin="severe_anaemia", score=100.0)
                    if hb_f < 10.0:
                        return FactorResult(bin="moderate_anaemia", score=70.0)
                    if hb_f < 11.0:
                        return FactorResult(bin="mild_anaemia", score=35.0)
                    return FactorResult(bin="no_anaemia", score=0.0)
                if pallor is not None:
                    mapping = {"severe": 100.0, "moderate": 70.0, "mild": 35.0, "no": 0.0}
                    if pallor in mapping:
                        return FactorResult(bin=f"{pallor}_pallor", score=mapping[pallor])
            return None

        elif factor_name == "prior_c_section":
            score = 70.0 if (val is True or val == "yes") else 0.0
            return FactorResult(bin="yes" if score == 70.0 else "no", score=score)

        elif factor_name == "gestational_age_anc1":
            if val == "no_prior_anc":
                return FactorResult(bin="no_prior_anc", score=100.0)
            try:
                w = float(val)
                if w <= 12:
                    return FactorResult(bin="first_trimester", score=0.0)
                if w <= 27:
                    return FactorResult(bin="second_trimester", score=40.0)
                return FactorResult(bin="third_trimester", score=80.0)
            except (ValueError, TypeError):
                return None

        elif factor_name == "maternal_age":
            try:
                age = float(val)
                if age < 18:
                    return FactorResult(bin="age_adolescent", score=90.0)
                if age <= 19:
                    return FactorResult(bin="age_young", score=30.0)
                if age <= 34:
                    return FactorResult(bin="age_optimal", score=0.0)
                return FactorResult(bin="age_advanced", score=60.0)
            except (ValueError, TypeError):
                return None

        elif factor_name == "birth_order_parity":
            try:
                p = int(val)
                if p == 0:
                    return FactorResult(bin="primigravida", score=25.0)
                if p in [1, 2]:
                    return FactorResult(bin="second_or_third", score=0.0)
                return FactorResult(bin="grand_multipara", score=75.0)
            except (ValueError, TypeError):
                return None

        elif factor_name == "education_level":
            mapping = {
                "higher_secondary_plus": 0.0,
                "secondary": 30.0,
                "primary": 60.0,
                "no_formal_education": 80.0
            }
            if val in mapping:
                return FactorResult(bin=str(val), score=mapping[val])
            return None

        elif factor_name == "household_autonomy":
            if val == "prefer_not_to_say":
                return None
            mapping = {
                "independent": 0.0,
                "shared_decision": 20.0,
                "limited_autonomy": 75.0
            }
            if val in mapping:
                return FactorResult(bin=str(val), score=mapping[val])
            return None

        elif factor_name == "distance_to_cemoc":
            try:
                m = float(val)
                if m <= 30:
                    return FactorResult(bin="under_30_min", score=0.0)
                if m <= 59:
                    return FactorResult(bin="30_to_59_min", score=35.0)
                if m <= 119:
                    return FactorResult(bin="60_to_119_min", score=70.0)
                return FactorResult(bin="over_120_min", score=100.0)
            except (ValueError, TypeError):
                return None

        elif factor_name == "transport_availability":
            mapping = {
                "always_available": 0.0,
                "delayed_on_call": 45.0,
                "difficult_or_none": 90.0
            }
            if val in mapping:
                return FactorResult(bin=str(val), score=mapping[val])
            return None

        elif factor_name == "past_referral_history":
            mapping = {
                "no_prior_referral": 0.0,
                "completed_on_time": 0.0,
                "past_non_completion": 85.0
            }
            if val in mapping:
                return FactorResult(bin=str(val), score=mapping[val])
            return None

        elif factor_name == "road_disruption_risk":
            mapping = {
                "all_weather_road": 0.0,
                "seasonal_flood_risk": 55.0,
                "active_road_cut": 100.0
            }
            if val in mapping:
                return FactorResult(bin=str(val), score=mapping[val])
            return None

        elif factor_name == "migration_status":
            mapping = {
                "settled_resident": 0.0,
                "seasonal_migrant": 65.0,
                "distress_displacement": 95.0
            }
            if val in mapping:
                return FactorResult(bin=str(val), score=mapping[val])
            return None

        return None

    def calculate(self, inputs: Dict[str, Any]) -> MviAssessmentResult:
        domain_results = {}
        total_observed_weight = 0.0
        total_possible_weight = 0.0
        missing_factors = []
        contributing_factors = []
        
        bound_scores_lower = {}
        bound_scores_upper = {}

        for d_name, d_conf in self.config["domains"].items():
            d_factors = d_conf["factors"]
            d_obs_wt = 0.0
            d_tot_wt = sum(f["weight"] for f in d_factors.values())
            d_weighted_score = 0.0
            d_lower_weighted = 0.0
            d_upper_weighted = 0.0

            for f_name, f_conf in d_factors.items():
                f_wt = f_conf["weight"]
                val = inputs.get(f_name)
                res = self.score_factor(d_name, f_name, val)

                if res is not None:
                    d_obs_wt += f_wt
                    d_weighted_score += f_wt * res.score
                    d_lower_weighted += f_wt * res.score
                    d_upper_weighted += f_wt * res.score
                    contributing_factors.append({
                        "factor": f_name,
                        "domain": d_name,
                        "score": res.score,
                        "weight": f_wt,
                        "weighted_points": round(f_wt * res.score * 0.25 / d_tot_wt, 2),
                        "bin": res.bin
                    })
                else:
                    missing_factors.append(f_name)
                    d_lower_weighted += f_wt * 0.0
                    d_upper_weighted += f_wt * 100.0

            d_completeness = d_obs_wt / d_tot_wt if d_tot_wt > 0 else 0.0
            d_score = round(d_weighted_score / d_obs_wt, 2) if d_obs_wt > 0 else None

            domain_results[d_name] = {
                "score": d_score,
                "completeness": round(d_completeness, 3),
                "sufficient_data": d_completeness >= self.config["min_domain_completeness"]
            }

            bound_scores_lower[d_name] = d_lower_weighted / d_tot_wt
            bound_scores_upper[d_name] = d_upper_weighted / d_tot_wt
            total_observed_weight += d_obs_wt
            total_possible_weight += d_tot_wt

        overall_completeness = round(total_observed_weight / total_possible_weight, 3)

        valid_domains = [d for d, res in domain_results.items() if res["score"] is not None]
        if valid_domains:
            overall_score = round(sum(domain_results[d]["score"] for d in valid_domains) / len(valid_domains), 2)
        else:
            overall_score = 0.0

        lower_bound = round(sum(bound_scores_lower.values()) / len(bound_scores_lower), 2)
        upper_bound = round(sum(bound_scores_upper.values()) / len(bound_scores_upper), 2)

        if overall_completeness < self.config["min_overall_completeness"]:
            band = "incomplete_provisional"
        elif overall_score < 30:
            band = "lower"
        elif overall_score < 55:
            band = "moderate"
        elif overall_score < 75:
            band = "elevated"
        else:
            band = "priority"

        contributing_factors.sort(key=lambda x: x["score"], reverse=True)

        explanation = {
            "config_version": self.config.get("version", "1.0.0"),
            "status": self.config.get("status", "PROVISIONAL_ILLUSTRATIVE"),
            "overall_score": overall_score,
            "band": band,
            "completeness": overall_completeness,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "domain_scores": {d: res["score"] for d, res in domain_results.items()},
            "missing_factors": missing_factors,
            "top_contributing_factors": contributing_factors[:4],
            "disclaimer_key": "mvi_disclaimer_not_clinical_diagnosis"
        }

        return MviAssessmentResult(
            overall_score=overall_score,
            completeness=overall_completeness,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            band=band,
            domain_scores={d: res["score"] for d, res in domain_results.items()},
            missing_factors=missing_factors,
            top_contributing_factors=contributing_factors[:4],
            explanation=explanation
        )

mvi_scorer = RuleBasedScorer()
