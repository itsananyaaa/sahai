from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel

class MetricCard(BaseModel):
    key: str
    label_key: str
    value: Union[int, float, str] # e.g. "<5" when cell suppression triggers
    unit: Optional[str] = None
    provenance: str = "Synthetic demo" # Operational count / Synthetic demo / Pilot measurement / Hypothesis
    definition_key: str

class FunnelStep(BaseModel):
    step_key: str
    count: Union[int, str]
    percentage: float

class AnalyticsSummaryResponse(BaseModel):
    metrics: List[MetricCard]
    funnel: List[FunnelStep]
    time_to_flag_hours: Optional[float] = None
    referral_completion_rate: Optional[float] = None
    small_cell_threshold: int = 5
    data_note: str = "Aggregated de-identified district records. Small cells (<5) suppressed per privacy rules."
