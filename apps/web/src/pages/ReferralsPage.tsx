import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalReferral, LocalCase } from "../db";
import { useAuthStore } from "../store/authStore";
import { syncManager } from "../sync/syncManager";
import { StatusBadge } from "../components/StatusBadge";
import {
  Share2,
  CheckCircle2,
  Plus,
  ArrowRight,
  Clock,
  Building2,
  MessageSquare,
  FileCheck
} from "lucide-react";

export const ReferralsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [referrals, setReferrals] = useState<LocalReferral[]>([]);
  const [casesMap, setCasesMap] = useState<Record<string, LocalCase>>({});
  const [selectedReferral, setSelectedReferral] = useState<LocalReferral | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [outcome, setOutcome] = useState("");

  const role = user?.role || "asha";

  useEffect(() => {
    const loadReferrals = async () => {
      const refs = await db.referrals.reverse().sortBy("created_at");
      setReferrals(refs);

      const cases = await db.cases.toArray();
      const map: Record<string, LocalCase> = {};
      for (const c of cases) map[c.id] = c;
      setCasesMap(map);

      if (refs.length > 0 && !selectedReferral) {
        setSelectedReferral(refs[0]);
      }
    };

    loadReferrals();
  }, []);

  const handleAcknowledge = async (ref: LocalReferral) => {
    if (role !== "anm_phc") return;

    await db.referrals.update(ref.id, {
      status: "Acknowledged",
      acknowledged_by: user?.full_name || "PHC Medical Officer",
      version: ref.version + 1,
      synced: false
    });

    await syncManager.enqueueOperation("referral", ref.id, "update", ref.version, {
      status: "Acknowledged"
    });

    const updated = await db.referrals.get(ref.id);
    if (updated) {
      setSelectedReferral(updated);
      setReferrals((prev) => prev.map((r) => (r.id === ref.id ? updated : r)));
    }
  };

  const handleComplete = async (ref: LocalReferral) => {
    if (role !== "anm_phc" || !outcome.trim()) return;

    await db.referrals.update(ref.id, {
      status: "Completed",
      outcome: outcome.trim(),
      version: ref.version + 1,
      synced: false
    });

    await syncManager.enqueueOperation("referral", ref.id, "update", ref.version, {
      status: "Completed",
      outcome: outcome.trim()
    });

    const updated = await db.referrals.get(ref.id);
    if (updated) {
      setSelectedReferral(updated);
      setReferrals((prev) => prev.map((r) => (r.id === ref.id ? updated : r)));
      setOutcome("");
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
            {role === "anm_phc" ? t("referrals.inbox_title") : t("referrals.title")}
          </h1>
          <p className="text-xs text-textSecondary mt-0.5">
            {role === "anm_phc"
              ? "Triage, acknowledge, and document clinical outcomes for incoming referrals."
              : "Track referral status and hospital acknowledgement. Local records queue offline."}
          </p>
        </div>

        {role === "asha" && (
          <Link
            to="/referrals/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t("referrals.btn_new_referral")}</span>
          </Link>
        )}
      </div>

      {referrals.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center text-xs text-textSecondary">
          {t("referrals.no_referrals")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Referrals List / Queue */}
          <div className="md:col-span-1 bg-surface border border-border rounded-2xl p-3 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-textSecondary uppercase tracking-wider px-2 py-1">
              Active Referral Queue ({referrals.length})
            </span>
            <div className="space-y-2 overflow-y-auto max-h-[550px] pr-1">
              {referrals.map((r) => {
                const c = casesMap[r.case_id];
                const isSelected = selectedReferral?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReferral(r)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-surfaceHover border-brand ring-1 ring-brand/40"
                        : "bg-background/80 border-border hover:bg-surfaceHover/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <StatusBadge type="priority" value={r.priority} />
                      <span className="text-[10px] text-textMuted font-mono">
                        {r.created_at.slice(0, 10)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-textPrimary">
                        {c?.first_name || "Beneficiary"}
                      </span>
                      <span className="text-[11px] font-mono text-brand font-semibold">
                        {c?.case_code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/50 text-[11px] text-textSecondary">
                      <span className="truncate max-w-[130px]">{r.receiving_facility_id}</span>
                      <StatusBadge type="status" value={r.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Detail View Panel */}
          {selectedReferral && (
            <div className="md:col-span-2 bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="priority" value={selectedReferral.priority} />
                    <span className="text-sm font-bold text-textPrimary">
                      {casesMap[selectedReferral.case_id]?.first_name || "Beneficiary"}
                    </span>
                  </div>
                  <StatusBadge type="status" value={selectedReferral.status} />
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-b border-border text-xs">
                  <div>
                    <span className="text-textSecondary block mb-0.5">Receiving Facility:</span>
                    <strong className="text-textPrimary flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-brand" />
                      {selectedReferral.receiving_facility_id}
                    </strong>
                  </div>

                  <div>
                    <span className="text-textSecondary block mb-0.5">Transport Arrangement:</span>
                    <strong className="text-textPrimary capitalize">
                      {selectedReferral.transport_status || "Arranged"}
                    </strong>
                  </div>
                </div>

                {/* Reason Codes */}
                <div className="py-4 border-b border-border">
                  <span className="text-xs font-bold text-textSecondary uppercase tracking-wider block mb-2">
                    Referral Triggers / Vulnerability Reasons
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReferral.reason_codes.map((rc) => (
                      <span
                        key={rc}
                        className="px-2.5 py-1 rounded-lg text-xs bg-neutral-900 border border-neutral-700 text-textPrimary font-medium"
                      >
                        {t(`factors.${rc}`, { defaultValue: t(`danger_signs.${rc}`, { defaultValue: rc }) })}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Outcome Display if Completed */}
                {selectedReferral.status === "Completed" && (
                  <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-800 text-xs text-teal-200 mt-4">
                    <span className="font-bold block mb-1">Clinical Outcome Documented:</span>
                    <p>{selectedReferral.outcome}</p>
                  </div>
                )}

                {/* ASHA Transmission Notice */}
                {role === "asha" && (
                  <div className="p-3 rounded-xl bg-background/80 border border-border text-xs text-textSecondary mt-4">
                    <p className="leading-relaxed">
                      <strong>Transmission Status:</strong> Stored on this device. When synchronized, this referral appears in the receiving Primary Health Centre triage queue.
                    </p>
                  </div>
                )}

                {/* ANM/PHC Clinical Action Panel */}
                {role === "anm_phc" && selectedReferral.status !== "Completed" && (
                  <div className="mt-5 p-4 rounded-xl bg-background/80 border border-border space-y-3">
                    <span className="text-xs font-bold text-textSecondary uppercase tracking-wider block">
                      Clinician Intake Actions
                    </span>

                    {selectedReferral.status === "Pending" && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(selectedReferral)}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-900/40"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t("referrals.action_acknowledge")}</span>
                      </button>
                    )}

                    {selectedReferral.status === "Acknowledged" && (
                      <div className="space-y-2">
                        <textarea
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                          placeholder="Document medical evaluation, treatments administered, delivery outcome..."
                          rows={2}
                          className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleComplete(selectedReferral)}
                          disabled={!outcome.trim()}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>{t("referrals.action_record_outcome")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
