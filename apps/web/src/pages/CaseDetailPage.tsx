import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalCase, LocalVisit, LocalAssessment, LocalReferral, LocalFollowUp } from "../db";
import { StatusBadge } from "../components/StatusBadge";
import {
  CalendarPlus,
  Share2,
  Clock,
  ArrowLeft,
  Activity,
  AlertTriangle,
  History,
  ShieldCheck
} from "lucide-react";

export const CaseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [currentCase, setCurrentCase] = useState<LocalCase | null>(null);
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [assessments, setAssessments] = useState<LocalAssessment[]>([]);
  const [referrals, setReferrals] = useState<LocalReferral[]>([]);
  const [followUps, setFollowUps] = useState<LocalFollowUp[]>([]);

  useEffect(() => {
    const loadDetails = async () => {
      if (!caseId) return;

      const c = await db.cases.get(caseId);
      setCurrentCase(c || null);

      const v = await db.visits.where("case_id").equals(caseId).reverse().sortBy("visit_date");
      setVisits(v);

      const a = await db.assessments.where("case_id").equals(caseId).reverse().sortBy("created_at");
      setAssessments(a);

      const r = await db.referrals.where("case_id").equals(caseId).reverse().sortBy("created_at");
      setReferrals(r);

      const fu = await db.follow_ups.where("case_id").equals(caseId).sortBy("due_date");
      setFollowUps(fu);
    };

    loadDetails();
  }, [caseId]);

  if (!currentCase) {
    return <div className="py-16 text-center text-xs text-textSecondary">Beneficiary case not found.</div>;
  }

  const latestAssessment = assessments[0];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/cases")}
          className="inline-flex items-center gap-1.5 text-xs text-textSecondary hover:text-textPrimary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Case Registry</span>
        </button>
      </div>

      {/* Case Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-lg border border-brand/30">
              {currentCase.case_code}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
              {currentCase.first_name}
            </h1>
            <StatusBadge type="status" value={currentCase.status} />
          </div>

          <p className="text-xs text-textSecondary mt-1.5">
            Age: <strong>{currentCase.age}</strong> yrs • Catchment: <strong>{currentCase.catchment_village}</strong> • Gravida: <strong>{currentCase.gravida}</strong> • Parity: <strong>{currentCase.parity}</strong> • Prior C-Section: <strong>{currentCase.prior_c_section}</strong>
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-semibold text-teal-300 bg-teal-950/60 border border-teal-800 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Consent Status: {currentCase.consent_status}
            </span>
            {currentCase.gestational_age_weeks && (
              <span className="text-[11px] font-semibold text-textSecondary bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-md">
                Gestational Age: {currentCase.gestational_age_weeks} weeks
              </span>
            )}
          </div>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/visits/new?caseId=${currentCase.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Record Visit</span>
          </Link>

          {latestAssessment && (
            <Link
              to={`/cases/${currentCase.id}/mvi?assessmentId=${latestAssessment.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surfaceHover border border-border hover:border-brand text-textPrimary transition-all"
            >
              <Activity className="w-4 h-4 text-brand" />
              <span>MVI Workspace</span>
            </Link>
          )}

          <Link
            to={`/referrals/new?caseId=${currentCase.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surfaceHover border border-border hover:border-textSecondary text-textPrimary transition-all"
          >
            <Share2 className="w-4 h-4 text-orange-400" />
            <span>Referral</span>
          </Link>
        </div>
      </div>

      {/* Latest Assessment Summary Banner */}
      {latestAssessment && (
        <div className="bg-gradient-to-r from-surfaceHover to-surface border border-border rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/50 text-brand flex items-center justify-center font-bold text-sm font-mono">
              {latestAssessment.overall_score.toFixed(0)}
            </div>
            <div>
              <span className="text-xs font-bold text-textPrimary block">
                Latest Vulnerability Assessment ({new Date(latestAssessment.created_at).toLocaleDateString()})
              </span>
              <span className="text-[11px] text-textSecondary">
                Data Completeness: {Math.round(latestAssessment.completeness * 100)}% • Range: {latestAssessment.lower_bound} – {latestAssessment.upper_bound}
              </span>
            </div>
          </div>
          <StatusBadge type="band" value={latestAssessment.band} />
        </div>
      )}

      {/* Longitudinal Timeline: Visits, Assessments, Referrals */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-brand" />
          Longitudinal Clinical History
        </h2>

        {visits.length === 0 ? (
          <div className="py-8 text-center text-xs text-textSecondary">
            No home visit observations recorded for this beneficiary yet.
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((v) => (
              <div key={v.id} className="p-4 rounded-xl bg-background/80 border border-border flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-textPrimary">
                    Visit #{v.visit_number} • {v.visit_date}
                  </span>
                  <span className="text-[11px] text-textMuted font-mono">
                    {v.synced ? "Synced" : "Local only"}
                  </span>
                </div>

                {v.notes && <p className="text-xs text-textSecondary">{v.notes}</p>}

                {v.danger_signs && v.danger_signs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {v.danger_signs.map((ds) => (
                      <span key={ds} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-700 text-red-300">
                        Danger Sign: {t(`danger_signs.${ds}`, { defaultValue: ds })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
