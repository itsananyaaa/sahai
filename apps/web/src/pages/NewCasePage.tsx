import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalCase } from "../db";
import { syncManager } from "../sync/syncManager";
import { useAuthStore } from "../store/authStore";
import { NumericStepper } from "../components/NumericStepper";
import { TriStateField } from "../components/TriStateField";
import { OptionCard } from "../components/OptionCard";
import { ArrowLeft, ArrowRight, ShieldCheck, AlertCircle, Check } from "lucide-react";

export const NewCasePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form State
  const [consentGiven, setConsentGiven] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("Mother");
  const [guardianConsentGiven, setGuardianConsentGiven] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState(24);
  const [village, setVillage] = useState("");

  const [lmpDate, setLmpDate] = useState("");
  const [eddDate, setEddDate] = useState("");
  const [gravida, setGravida] = useState(1);
  const [parity, setParity] = useState(0);
  const [priorCSection, setPriorCSection] = useState("no");
  const [educationLevel, setEducationLevel] = useState("secondary");
  const [householdAutonomy, setHouseholdAutonomy] = useState("shared_decision");

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived gestational age in weeks
  const calculateGestationalWeeks = (lmp: string): number | null => {
    if (!lmp) return null;
    const lmpTime = new Date(lmp).getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - lmpTime) / (1000 * 3600 * 24));
    return Math.max(0, Math.min(Math.round(diffDays / 7), 44));
  };

  const gestationalWeeks = calculateGestationalWeeks(lmpDate);

  const isMinor = age < 18;

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!consentGiven) {
        setErrorMessage("Informed consent must be confirmed to proceed.");
        return;
      }
      if (isMinor && (!guardianConsentGiven || !guardianName.trim())) {
        setErrorMessage("DPDP Rules 2025: Guardian consent and name are mandatory for minors under 18.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!firstName.trim() || !village.trim()) {
        setErrorMessage("Beneficiary name/initials and village are required.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const caseId = crypto.randomUUID();
    const count = (await db.cases.count()) + 1;
    const caseCode = `SYN-${String(count).padStart(4, "0")}`;

    const newCasePayload: LocalCase = {
      id: caseId,
      case_code: caseCode,
      first_name: firstName.trim(),
      age,
      lmp_date: lmpDate || undefined,
      edd_date: eddDate || undefined,
      gestational_age_weeks: gestationalWeeks || undefined,
      gravida,
      parity,
      prior_c_section: priorCSection,
      birth_order: parity + 1,
      education_level: educationLevel,
      household_autonomy: householdAutonomy,
      assigned_asha_id: user?.id || "local-asha",
      catchment_village: village.trim(),
      nearest_facility_id: user?.facility_id || "phc-alpha",
      consent_status: isMinor ? "guardian_verified" : "given",
      status: "active",
      version: 1,
      synced: false,
      updated_at: new Date().toISOString()
    };

    // Save locally to Dexie IndexedDB
    await db.cases.add(newCasePayload);

    // Enqueue in offline sync outbox
    await syncManager.enqueueOperation("case", caseId, "create", 1, newCasePayload);

    navigate(`/cases/${caseId}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* Stepper Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-textSecondary mb-2">
          <span className="uppercase tracking-wider">{t("wizard.step_indicator", { current: step, total: totalSteps })}</span>
          <span className="text-brand font-bold">
            {step === 1 ? "Informed Consent" : step === 2 ? "Beneficiary Profile" : "Clinical & Obstetric History"}
          </span>
        </div>
        {/* Thin progress line from reference design */}
        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xl">
        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Consent & Minor Protection */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                {t("wizard.consent_title")}
              </h2>
              <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                {t("wizard.consent_description")}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-background/80 border border-border text-xs text-textSecondary space-y-2">
              <p className="font-semibold text-textPrimary">{t("wizard.consent_purpose")}</p>
              <ul className="list-disc pl-4 space-y-1 text-textMuted text-[11px]">
                <li>All health data stored locally on this frontline device.</li>
                <li>Data shared solely with authorized Primary Health Centre clinicians upon referral.</li>
                <li>Right to withdraw consent at any time without prejudice to standard healthcare access.</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-surfaceHover/50 cursor-pointer hover:border-brand/50 transition-colors">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 rounded border-neutral-700 text-brand focus:ring-0 focus:ring-offset-0 bg-neutral-900"
              />
              <span className="text-xs text-textPrimary leading-relaxed">
                {t("wizard.consent_checkbox")}
              </span>
            </label>

            {/* Check age for minor guardrail */}
            <div className="pt-2 border-t border-border">
              <NumericStepper
                label="Beneficiary Age (Years)"
                value={age}
                onChange={setAge}
                min={12}
                max={55}
              />
            </div>

            {isMinor && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-300">
                    {t("wizard.consent_minor_warning")}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-textSecondary block mb-1">
                      {t("wizard.guardian_name")} *
                    </label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Kamala Devi"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-textSecondary block mb-1">
                      {t("wizard.guardian_relation")}
                    </label>
                    <select
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-brand"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Husband/Guardian">Husband / Legal Guardian</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guardianConsentGiven}
                    onChange={(e) => setGuardianConsentGiven(e.target.checked)}
                    className="rounded border-neutral-700 text-brand focus:ring-0 bg-neutral-900"
                  />
                  <span className="text-xs text-amber-200">
                    {t("wizard.guardian_consent_checkbox")}
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Demographics */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textPrimary">
              {t("wizard.demo_title")}
            </h2>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.first_name")} *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Beneficiary given name or initials"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.village")} *
              </label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Catchment Village / Sub-centre hamlet"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.education_level")}
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                <option value="higher_secondary_plus">Higher Secondary or Higher (12th+)</option>
                <option value="secondary">Secondary School (10th)</option>
                <option value="primary">Primary School</option>
                <option value="no_formal_education">No Formal Schooling</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                {t("wizard.household_autonomy")}
              </label>
              <select
                value={householdAutonomy}
                onChange={(e) => setHouseholdAutonomy(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
              >
                <option value="independent">Independent Decision Making</option>
                <option value="shared_decision">Shared Decision Making (with spouse/family)</option>
                <option value="limited_autonomy">Limited Decision Autonomy</option>
                <option value="prefer_not_to_say">Prefer Not to Answer</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 3: Obstetric History */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textPrimary">
              {t("wizard.obstetric_title")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("wizard.lmp_date")}
                </label>
                <input
                  type="date"
                  value={lmpDate}
                  onChange={(e) => setLmpDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                  {t("wizard.edd_date")}
                </label>
                <input
                  type="date"
                  value={eddDate}
                  onChange={(e) => setEddDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {gestationalWeeks !== null && (
              <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800 text-xs text-teal-300 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400" />
                {t("wizard.gestational_age_derived", { weeks: gestationalWeeks })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <NumericStepper
                label={t("wizard.gravida")}
                value={gravida}
                onChange={setGravida}
                min={1}
                max={15}
              />
              <NumericStepper
                label={t("wizard.parity")}
                value={parity}
                onChange={setParity}
                min={0}
                max={14}
              />
            </div>

            <TriStateField
              label={t("wizard.prior_c_section")}
              value={priorCSection}
              onChange={setPriorCSection}
            />
          </div>
        )}

        {/* Wizard Footer Controls */}
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
              onClick={() => navigate("/cases")}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-textMuted hover:text-textSecondary transition-colors"
            >
              {t("wizard.btn_cancel")}
            </button>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20 ml-auto"
            >
              <span>{t("wizard.btn_next")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
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
