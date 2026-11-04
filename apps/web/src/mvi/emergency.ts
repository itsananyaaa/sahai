import emergencyRules from "@sahai/mvi-spec/emergency-rules.v1.json";

export interface EmergencyResult {
  has_emergency: boolean;
  triggers_fired: string[];
  result: "urgent_referral" | "normal";
  action_shown: string;
  priority: "Urgent" | "Routine";
}

export function evaluateEmergency(
  dangerSigns: string[] = [],
  bloodPressure?: { systolic?: number; diastolic?: number }
): EmergencyResult {
  const triggersFired: string[] = [];

  for (const ds of dangerSigns) {
    if (ds && !triggersFired.includes(ds)) {
      triggersFired.push(ds);
    }
  }

  if (bloodPressure && typeof bloodPressure === "object") {
    const { systolic, diastolic } = bloodPressure;
    if ((systolic !== undefined && systolic >= 160) || (diastolic !== undefined && diastolic >= 110)) {
      if (!triggersFired.includes("severe_hypertension_reading")) {
        triggersFired.push("severe_hypertension_reading");
      }
    }
  }

  const hasEmergency = triggersFired.length > 0;

  return {
    has_emergency: hasEmergency,
    triggers_fired: triggersFired,
    result: hasEmergency ? "urgent_referral" : "normal",
    action_shown: hasEmergency ? "action_immediate_facility_transfer" : "action_routine_follow_up",
    priority: hasEmergency ? "Urgent" : "Routine"
  };
}
