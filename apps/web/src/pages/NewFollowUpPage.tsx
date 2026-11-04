import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalCase, LocalFollowUp } from "../db";
import { syncManager } from "../sync/syncManager";
import { useAuthStore } from "../store/authStore";
import { ArrowLeft, Clock, Check } from "lucide-react";

export const NewFollowUpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const caseIdParam = searchParams.get("caseId") || "";

  const [cases, setCases] = useState<LocalCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdParam);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [type, setType] = useState("routine_anc");
  const [notes, setNotes] = useState("");

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
    if (!selectedCaseId || !dueDate) return;

    const fuId = crypto.randomUUID();
    const payload: LocalFollowUp = {
      id: fuId,
      case_id: selectedCaseId,
      asha_id: user?.id || "local-asha",
      due_date: dueDate,
      type,
      status: "Pending",
      notes: notes.trim() || undefined,
      version: 1,
      synced: false
    };

    await db.follow_ups.add(payload);
    await syncManager.enqueueOperation("follow_up", fuId, "create", 1, payload);

    navigate("/follow-ups");
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
          <div className="w-8 h-8 rounded-lg bg-teal-950/60 border border-teal-800 text-teal-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold text-textPrimary">Schedule Home Follow-up Visit</h1>
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
              Target Visit Date *
            </label>
            <input
              type="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              Visit Purpose / Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
            >
              <option value="routine_anc">Routine Antenatal Check (ANC)</option>
              <option value="bp_monitoring">Blood Pressure & Preeclampsia Monitoring</option>
              <option value="referral_follow_up">Post-Referral Hospital Compliance Check</option>
              <option value="post_partum">Postpartum Newborn & Maternal Check</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              Follow-up Checklist Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bring IFA tablets, check pallor, verify ambulance contact..."
              rows={2}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-textPrimary focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl font-bold text-xs bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Schedule Follow-up</span>
          </button>
        </form>
      </div>
    </div>
  );
};
