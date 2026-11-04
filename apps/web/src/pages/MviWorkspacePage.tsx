import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalCase, LocalAssessment } from "../db";
import { ScoreGauge } from "../components/ScoreGauge";
import { DomainRadar } from "../components/DomainRadar";
import { StatusBadge } from "../components/StatusBadge";
import {
  Share2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock
} from "lucide-react";

export const MviWorkspacePage: React.FC = () => {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const assessmentId = searchParams.get("assessmentId");

  const [currentCase, setCurrentCase] = useState<LocalCase | null>(null);
  const [assessment, setAssessment] = useState<LocalAssessment | null>(null);
  const [history, setHistory] = useState<LocalAssessment[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!caseId) return;

      const c = await db.cases.get(caseId);
      setCurrentCase(c || null);

      const assessments = await db.assessments
        .where("case_id")
        .equals(caseId)
        .reverse()
        .sortBy("created_at");

      setHistory(assessments);

      if (assessmentId) {
        const found = assessments.find((a) => a.id === assessmentId);
        setAssessment(found || assessments[0] || null);
      } else if (assessments.length > 0) {
        setAssessment(assessments[0]);
      }
    };

    loadData();
  }, [caseId, assessmentId]);

  if (!currentCase || !assessment) {
    return (
      <div className="py-16 text-center text-xs text-textSecondary">
        Loading Maternal Vulnerability Index calculation...
      </div>
    );
  }

  const exp = assessment.explanation || {};
  const topFactors = exp.top_contributing_factors || [];
  const missingFactors = exp.missing_factors || [];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Top Beneficiary Header Bar */}
      <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand">{currentCase.case_code}</span>
            <span className="text-lg font-black text-textPrimary">{currentCase.first_name}</span>
            <span className="text-xs text-textSecondary">({currentCase.age} yrs)</span>
          </div>
          <p className="text-xs text-textSecondary mt-0.5">
            Village: <strong>{currentCase.catchment_village}</strong> • Gestational Age: <strong>{currentCase.gestational_age_weeks || "ANC"} weeks</strong>
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5">
          <Link
            to={`/referrals/new?caseId=${currentCase.id}&priority=${assessment.band === "priority" ? "Priority" : "Routine"}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Initiate Referral</span>
          </Link>

          <Link
            to={`/follow-ups/new?caseId=${currentCase.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surfaceHover border border-border hover:border-textSecondary text-textPrimary transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-textSecondary" />
            <span>Schedule Follow-up</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Gauge + 4-Domain Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ScoreGauge
          score={assessment.overall_score}
          completeness={assessment.completeness}
          lowerBound={assessment.lower_bound}
          upperBound={assessment.upper_bound}
          band={assessment.band}
        />

        <DomainRadar domainScores={exp.domain_scores || {}} />
      </div>

      {/* Contributing Factors & Missing Data Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Contributing Factors */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand" />
            {t("mvi.top_contributors")}
          </h3>

          {topFactors.length === 0 ? (
            <p className="text-xs text-textMuted py-4">No elevated vulnerability factors recorded.</p>
          ) : (
            <div className="space-y-3">
              {topFactors.map((f: any, idx: number) => (
                <div key={idx} className="bg-background/80 border border-border/60 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-textPrimary">
                      {t(`factors.${f.factor}`, { defaultValue: f.factor })}
                    </span>
                    <span className="font-mono text-brand font-bold">
                      +{f.weighted_points} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-textMuted">
                    <span className="capitalize">{f.domain} Domain</span>
                    <span>Bin: {f.bin}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing / Unassessed Data */}
        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              {t("mvi.missing_factors")}
            </h3>

            {missingFactors.length === 0 ? (
              <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-800 text-xs text-teal-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>All assessment domains fully observed. Uncertainty is minimized.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-textSecondary mb-2">
                  The following factors were unobserved. Collecting them on subsequent visits will narrow the uncertainty range:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missingFactors.map((f: string) => (
                    <span
                      key={f}
                      className="px-2.5 py-1 rounded-lg text-xs bg-neutral-900 border border-neutral-700 text-textSecondary"
                    >
                      {t(`factors.${f}`, { defaultValue: f })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Plan Guidance */}
          <div className="mt-4 pt-3 border-t border-border">
            <span className="text-[11px] font-bold text-textSecondary uppercase tracking-wider block mb-1">
              Frontline Recommended Action
            </span>
            <p className="text-xs text-textPrimary leading-relaxed">
              {assessment.band === "priority"
                ? "Immediate clinical consultation with Primary Health Centre ANM/MO recommended within 24-48 hours. Review danger signs with beneficiary."
                : assessment.band === "elevated"
                ? "Schedule priority home follow-up within 7 days. Monitor BP and anaemia progression."
                : "Continue routine antenatal care contact per state protocol. Encourage institutional delivery preparation."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
