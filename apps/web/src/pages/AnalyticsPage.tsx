import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../api/client";
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface Metric {
  key: string;
  label_key: string;
  value: any;
  unit?: string;
  provenance: string;
  definition_key: string;
}

interface FunnelStep {
  step_key: string;
  count: any;
  percentage: number;
}

export const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [showDefinitions, setShowDefinitions] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res: any = await apiFetch("/analytics/summary");
        if (res.metrics) setMetrics(res.metrics);
        if (res.funnel) setFunnel(res.funnel);
      } catch (e) {
        // Fallback local display
        setMetrics([
          { key: "registered_cases", label_key: "analytics.metric_registered_cases", value: "14", provenance: "Synthetic demo", definition_key: "def_cases" },
          { key: "visits_recorded", label_key: "analytics.metric_visits_recorded", value: "28", provenance: "Synthetic demo", definition_key: "def_visits" },
          { key: "referral_completion_rate", label_key: "analytics.metric_referral_completion_rate", value: "83.3%", unit: "%", provenance: "Synthetic demo", definition_key: "def_completion" },
          { key: "pending_follow_ups", label_key: "analytics.metric_pending_follow_ups", value: "<5", provenance: "Synthetic demo", definition_key: "def_follow_ups" },
          { key: "time_to_flag", label_key: "analytics.metric_time_to_flag", value: "0.1 hrs", unit: "hours", provenance: "Synthetic demo", definition_key: "def_flag_time" },
          { key: "doc_time_saved", label_key: "analytics.metric_doc_time_saved", value: "Unavailable (Requires baseline study)", provenance: "Hypothesis", definition_key: "def_time_saved" }
        ]);

        setFunnel([
          { step_key: "analytics.funnel_visits", count: 28, percentage: 100.0 },
          { step_key: "analytics.funnel_assessments", count: 28, percentage: 100.0 },
          { step_key: "analytics.funnel_flagged", count: 8, percentage: 28.6 },
          { step_key: "analytics.funnel_referred", count: 6, percentage: 75.0 },
          { step_key: "analytics.funnel_acknowledged", count: 6, percentage: 100.0 },
          { step_key: "analytics.funnel_completed", count: 5, percentage: 83.3 }
        ]);
      }
    };

    loadAnalytics();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
          {t("analytics.title")}
        </h1>
        <p className="text-xs text-textSecondary mt-0.5 leading-relaxed">
          {t("analytics.subtitle")}
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.key} className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-textSecondary leading-snug">
                {t(m.label_key, { defaultValue: m.label_key })}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-textMuted flex-shrink-0">
                {m.provenance}
              </span>
            </div>

            <div className="my-3">
              <span className="text-2xl font-black text-textPrimary font-mono">
                {m.value}
              </span>
            </div>

            <p className="text-[10px] text-textMuted italic">
              {m.key === "doc_time_saved"
                ? "Armman / DeepMind evidential standard: Time-and-motion validation pending."
                : m.value === "<5"
                ? "Value suppressed (<5) per DPDP anonymization rules."
                : "Aggregated from frontline verified case records."}
            </p>
          </div>
        ))}
      </div>

      {/* Referral Continuum Funnel */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            {t("analytics.funnel_title")}
          </h2>
          <span className="text-xs text-textSecondary font-mono">End-to-End Retention</span>
        </div>

        <div className="space-y-3 pt-2">
          {funnel.map((step, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-textPrimary">{t(step.step_key, { defaultValue: step.step_key })}</span>
                <span className="font-bold text-textSecondary">
                  {step.count} ({step.percentage}%)
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(4, step.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Definitions Accordion Drawer */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <button
          type="button"
          onClick={() => setShowDefinitions(!showDefinitions)}
          className="w-full flex items-center justify-between text-left text-xs font-bold text-textPrimary uppercase tracking-wider"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand" />
            {t("analytics.definitions_title")}
          </span>
          {showDefinitions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDefinitions && (
          <div className="mt-4 pt-4 border-t border-border text-xs text-textSecondary space-y-3 leading-relaxed">
            <div>
              <strong className="text-textPrimary block">Referral Completion Rate:</strong>
              Calculated as Completed Referrals divided by Total Eligible Referrals (excluding verified cancellations). We do not claim mortality reduction; referral completion is our primary validated outcome metric.
            </div>
            <div>
              <strong className="text-textPrimary block">Time-to-Flag:</strong>
              Elapsed interval between the first recorded qualifying observation timestamp and the generation of an elevated vulnerability prioritisation alert.
            </div>
            <div>
              <strong className="text-textPrimary block">Small-Cell Suppression:</strong>
              Counts strictly below 5 are masked as &ldquo;&lt;5&rdquo; to prevent re-identification of individual pregnant women in rural villages with small populations.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
