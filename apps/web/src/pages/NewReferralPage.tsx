import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalCase, LocalReferral } from "../db";
import { syncManager } from "../sync/syncManager";
import { useAuthStore } from "../store/authStore";
import { ArrowLeft, Share2, Check, AlertOctagon } from "lucide-react";

export const NewReferralPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const caseIdParam = searchParams.get("caseId") || "";
  const priorityParam = searchParams.get("priority") || "Priority";
  const triggersRaw = searchParams.get("triggers") || "";

  const [cases, setCases] = useState<LocalCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdParam);
  const [priority, setPriority] = useState(priorityParam);
  const [facility, setFacility] = useState("PHC Alpha (CEmOC)");
  const [transportStatus, setTransportStatus] = useState("arranged");
  const [reasonCodes, setReasonCodes] = useState<string[]>(
    triggersRaw ? triggersRaw.split(",").filter(Boolean) : ["elevated_vulnerability"]
  );

  useEffect(() => {
    const load = async () => {
      const list = await db.cases.toArray();
      setCases(list);
      if (!selectedCaseId && list.length > 0) {
        setSelectedCaseId(list[0].id);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    const refId = crypto.randomUUID();
    const payload: LocalReferral = {
      id: refId,
      case_id: selectedCaseId,
      reason_codes: reasonCodes,
      priority,
      receiving_facility_id: facility,
      status: "Pending",
      transport_status: transportStatus,
      version: 1,
      synced: false,
      created_at: new Date().toISOString()
    };

    await db.referrals.add(payload);
    await syncManager.enqueueOperation("referral", refId, "create", 1, payload);

    navigate("/referrals");
  };

  return (
    <div className="max-w-xl mx-auto py-2">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-textSecondary hover:text-textPrimary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xl">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/50 text-brand flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold text-textPrimary">Initiate Case Referral</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              Beneficiary *
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

          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              Referral Priority *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Urgent", "Priority", "Routine"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    priority === p
                      ? p === "Urgent"
                        ? "bg-red-950/80 border-red-600 text-red-200"
                        : p === "Priority"
                        ? "bg-orange-950/80 border-orange-600 text-orange-200"
                        : "bg-surfaceHover border-textSecondary text-textPrimary"
                      : "bg-surface border-border text-textSecondary hover:bg-surfaceHover"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              Receiving Health Facility *
            </label>
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
            >
              <option value="PHC Alpha (CEmOC)">PHC Alpha (CEmOC Capable - 24/7)</option>
              <option value="CHC Beta (Blood Bank)">CHC Beta (Community Health Centre & Blood Bank)</option>
              <option value="District Hospital Gamma">District Hospital Gamma</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              Emergency Transport Readiness
            </label>
            <select
              value={transportStatus}
              onChange={(e) => setTransportStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
            >
              <option value="arranged">108 Ambulance / Village Vehicle Arranged</option>
              <option value="family_transport">Private / Family Arranged Vehicle</option>
              <option value="transport_support_needed">Transport Support / Mobilization Needed</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-background/80 border border-border text-xs text-textSecondary leading-relaxed">
            <span className="font-bold text-textPrimary block mb-1">Evidentiary Standard Disclosure:</span>
            Submitting this form records the referral in this frontline device&apos;s outbox queue. Upon synchronization, it populates the receiving facility&apos;s triage inbox. No external SMS or automated hospital dispatch is claimed.
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl font-bold text-xs bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Queue Referral</span>
          </button>
        </form>
      </div>
    </div>
  );
};
