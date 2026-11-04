import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalCase, LocalVisit, LocalAssessment } from "../db";
import { syncManager } from "../sync/syncManager";
import { useAuthStore } from "../store/authStore";
import { mviScorer } from "../mvi/engine";
import { evaluateEmergency } from "../mvi/emergency";
import { TriStateField } from "../components/TriStateField";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { ArrowLeft, ArrowRight, AlertTriangle, AlertOctagon, Check, Activity, ShieldAlert } from "lucide-react";

export const VisitWizardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const preselectedCaseId = searchParams.get("caseId") || "";

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [cases, setCases] = useState<LocalCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState(preselectedCaseId);
  const [visitNumber, setVisitNumber] = useState(1);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));

  // Danger signs (checked: true/false)
  const [dangerSigns, setDangerSigns] = useState<Record<string, boolean>>({
    vaginal_bleeding: false,
    convulsions_fits: false,
    severe_headache_blurred_vision: false,
    severe_abdominal_pain: false,
    reduced_absent_fetal_movement: false,
    difficulty_breathing: false,
    high_fever: false,
    leaking_fluid_premature_labour: false,
    facial_swelling_with_headache: false
  });

  // Clinical Vitals
  const [systolic, setSystolic] = useState<number | "">("");
  const [diastolic, setDiastolic] = useState<number | "">("");
  const [bpTrend, setBpTrend] = useState("stable_normal");
  const [hb, setHb] = useState<number | "">("");
  const [pallor, setPallor] = useState("no");
  const [anc1Weeks, setAnc1Weeks] = useState<number | "">("");

  // Social & Environmental Inputs
  const [distanceToCemoc, setDistanceToCemoc] = useState(30);
  const [transportAvailability, setTransportAvailability] = useState("always_available");
  const [pastReferralHistory, setPastReferralHistory] = useState("no_prior_referral");
  const [roadRisk, setRoadRisk] = useState("all_weather_road");
  const [migrationStatus, setMigrationStatus] = useState("settled_resident");
  const [clinicalNotes, setClinicalNotes] = useState("");

  useEffect(() => {
    const loadCases = async () => {
      const list = await db.cases.toArray();
      setCases(list);
      if (!selectedCaseId && list.length > 0) {
        setSelectedCaseId(list[0].id);
      }
    };
    loadCases();
  }, []);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const toggleDangerSign = (key: string) => {
    setDangerSigns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeDangerSignsList = Object.entries(dangerSigns)
    .filter(([_, val]) => val)
    .map(([key]) => key);

  const handleVoiceTranscript = (text: string) => {
    setClinicalNotes((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const handleComplete = async () => {
    if (!selectedCaseId) return;

    const visitId = crypto.randomUUID();
    const assessmentId = crypto.randomUUID();

    // 1. Build observations
    const observations = [];
    const bpObj: any = {};
    if (typeof systolic === "number") {
      observations.push({ observation_type: "bp_systolic", value_numeric: systolic, status: "yes" });
      bpObj.systolic = systolic;
    }
    if (typeof diastolic === "number") {
      observations.push({ observation_type: "bp_diastolic", value_numeric: diastolic, status: "yes" });
      bpObj.diastolic = diastolic;
    }
    if (typeof hb === "number") {
      observations.push({ observation_type: "hb", value_numeric: hb, status: "yes" });
    }
    observations.push({ observation_type: "pallor", value_text: pallor, status: "yes" });

    // 2. Evaluate Emergency Triggers
    const emergencyRes = evaluateEmergency(activeDangerSignsList, bpObj);

    // 3. Compute MVI Assessment
    const mviInputs: Record<string, any> = {
      blood_pressure: bpObj.systolic !== undefined ? bpObj : undefined,
      bp_trend: bpTrend,
      anaemia: typeof hb === "number" ? { hb, pallor } : { pallor },
      prior_c_section: selectedCase?.prior_c_section === "yes",
      gestational_age_anc1: typeof anc1Weeks === "number" ? anc1Weeks : undefined,
      maternal_age: selectedCase?.age,
      birth_order_parity: selectedCase?.parity,
      education_level: selectedCase?.education_level,
      household_autonomy: selectedCase?.household_autonomy,
      distance_to_cemoc: distanceToCemoc,
      transport_availability: transportAvailability,
      past_referral_history: pastReferralHistory,
      road_disruption_risk: roadRisk,
      migration_status: migrationStatus
    };

    const mviRes = mviScorer.calculate(mviInputs);

    // 4. Save to Local Dexie DB
    const visitPayload: LocalVisit = {
      id: visitId,
      case_id: selectedCaseId,
      asha_id: user?.id || "local-asha",
      visit_number: visitNumber,
      visit_date: visitDate,
      notes: clinicalNotes,
      observations,
      danger_signs: activeDangerSignsList,
      synced: false,
      created_at: new Date().toISOString()
    };
    await db.visits.add(visitPayload);

    const assessmentPayload: LocalAssessment = {
      id: assessmentId,
      case_id: selectedCaseId,
      visit_id: visitId,
      overall_score: mviRes.overall_score,
      completeness: mviRes.completeness,
      lower_bound: mviRes.lower_bound,
      upper_bound: mviRes.upper_bound,
      band: mviRes.band,
      explanation: mviRes.explanation,
      created_at: new Date().toISOString()
    };
    await db.assessments.add(assessmentPayload);

    // 5. Enqueue in Outbox
    await syncManager.enqueueOperation("visit", visitId, "create", 1, {
      ...visitPayload,
      mvi_inputs: mviInputs
    });

    // 6. Navigation: if emergency, immediately show emergency escalation!
    if (emergencyRes.has_emergency) {
      navigate(`/emergency?caseId=${selectedCaseId}&visitId=${visitId}&triggers=${encodeURIComponent(activeDangerSignsList.join(","))}`);
    } else {
      navigate(`/cases/${selectedCaseId}/mvi?assessmentId=${assessmentId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2">
      {/* Stepper Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-textSecondary mb-2">
          <span className="uppercase tracking-wider">{t("wizard.step_indicator", { current: step, total: totalSteps })}</span>
          <span className="text-brand font-bold">
            {step === 1
              ? "Visit Context"
              : step === 2
              ? "Emergency Danger Signs"
              : step === 3
              ? "Clinical Vitals & Symptoms"
              : "Social & Environmental Barriers"}
          </span>
        </div>
        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xl">
        {/* STEP 1: Case Context */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textPrimary">{t("visit.title")}</h2>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                Select Beneficiary
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} ({c.case_code}) • {c.catchment_village}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("visit.visit_number")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={visitNumber}
                  onChange={(e) => setVisitNumber(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("visit.visit_date")}
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {selectedCase && (
              <div className="p-3.5 rounded-xl bg-background/80 border border-border mt-2">
                <span className="text-[11px] font-bold text-textSecondary uppercase tracking-wider block mb-1.5">
                  Beneficiary Background
                </span>
                <p className="text-xs text-textPrimary">
                  Age: <strong>{selectedCase.age}</strong> yrs • Gravida: <strong>{selectedCase.gravida}</strong> • Parity: <strong>{selectedCase.parity}</strong> • Prior C-Section: <strong>{selectedCase.prior_c_section}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Danger Signs Checklist */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-500" />
                {t("visit.danger_signs_section")}
              </h2>
              <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                {t("visit.danger_signs_warning")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {Object.keys(dangerSigns).map((key) => {
                const checked = dangerSigns[key];
                return (
                  <div
                    key={key}
                    onClick={() => toggleDangerSign(key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? "bg-red-950/40 border-red-600 ring-1 ring-red-600/50"
                        : "bg-surface border-border hover:bg-surfaceHover/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // Handled by div onClick
                      className="mt-0.5 rounded border-neutral-700 text-red-600 focus:ring-0 bg-neutral-900"
                    />
                    <span className={`text-xs font-medium leading-snug ${checked ? "text-red-200 font-bold" : "text-textPrimary"}`}>
                      {t(`danger_signs.${key}`)}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeDangerSignsList.length > 0 && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-600 text-red-200 text-xs font-semibold flex items-center gap-2 mt-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>
                  {activeDangerSignsList.length} danger sign(s) checked. Urgent facility escalation will trigger on submission.
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Vitals & Observations */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand" />
                {t("visit.vitals_section")}
              </h2>
              <VoiceInputButton onTranscriptConfirmed={handleVoiceTranscript} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("visit.bp_systolic")}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("visit.bp_diastolic")}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 80"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("visit.bp_trend")}
              </label>
              <select
                value={bpTrend}
                onChange={(e) => setBpTrend(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                <option value="stable_normal">Stable / Normal Trend</option>
                <option value="fluctuating">Fluctuating BP Across Visits</option>
                <option value="rising_trend">Steadily Rising Trend</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("visit.hb_value")}
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 11.2"
                  value={hb}
                  onChange={(e) => setHb(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("visit.pallor")}
                </label>
                <select
                  value={pallor}
                  onChange={(e) => setPallor(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
                >
                  <option value="no">No Pallor Observed</option>
                  <option value="mild">Mild Pallor</option>
                  <option value="moderate">Moderate Pallor</option>
                  <option value="severe">Severe Pallor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("visit.clinical_notes")}
              </label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Observation notes, complaints, diet compliance..."
                rows={2}
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-textPrimary focus:outline-none focus:border-brand resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Social & Environmental Barriers */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textPrimary">
              Social, Access & Environmental Context
            </h2>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.distance_to_cemoc")} (Minutes)
              </label>
              <select
                value={distanceToCemoc}
                onChange={(e) => setDistanceToCemoc(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                <option value={20}>Under 30 Minutes</option>
                <option value={45}>30 to 59 Minutes</option>
                <option value={80}>60 to 119 Minutes</option>
                <option value={150}>120 Minutes or more</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.transport_ready")}
              </label>
              <select
                value={transportAvailability}
                onChange={(e) => setTransportAvailability(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                <option value="always_available">Always Available (108 / Local Vehicle)</option>
                <option value="delayed_on_call">Delayed on Call (30-60 min response)</option>
                <option value="difficult_or_none">Difficult / No Reliable Emergency Transport</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.road_risk")}
              </label>
              <select
                value={roadRisk}
                onChange={(e) => setRoadRisk(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                <option value="all_weather_road">All-Weather Pucca Road</option>
                <option value="seasonal_flood_risk">Seasonal Flood / Waterlogging Risk</option>
                <option value="active_road_cut">Active Road Cut / Inaccessible Terrain</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.migration_status")}
              </label>
              <select
                value={migrationStatus}
                onChange={(e) => setMigrationStatus(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                <option value="settled_resident">Permanent Settled Resident</option>
                <option value="seasonal_migrant">Seasonal Labor Migrant</option>
                <option value="distress_displacement">Distress Displacement / Transient</option>
              </select>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-surfaceHover text-textSecondary hover:text-textPrimary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("wizard.btn_back")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-textMuted hover:text-textSecondary transition-colors"
            >
              {t("wizard.btn_cancel")}
            </button>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20 ml-auto"
            >
              <span>{t("wizard.btn_next")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20 ml-auto"
            >
              <Check className="w-4 h-4" />
              <span>{t("wizard.btn_submit")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
