import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db, LocalFollowUp, LocalCase } from "../db";
import { syncManager } from "../sync/syncManager";
import { StatusBadge } from "../components/StatusBadge";
import { Clock, CheckCircle2, Calendar, AlertCircle, Plus, X } from "lucide-react";

export const FollowUpsPage: React.FC = () => {
  const { t } = useTranslation();
  const [followUps, setFollowUps] = useState<LocalFollowUp[]>([]);
  const [casesMap, setCasesMap] = useState<Record<string, LocalCase>>({});

  // Reschedule Modal
  const [rescheduleTarget, setRescheduleTarget] = useState<LocalFollowUp | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Complete Modal
  const [completeTarget, setCompleteTarget] = useState<LocalFollowUp | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const loadFollowUps = async () => {
    const list = await db.follow_ups.orderBy("due_date").toArray();
    setFollowUps(list);

    const cases = await db.cases.toArray();
    const map: Record<string, LocalCase> = {};
    for (const c of cases) map[c.id] = c;
    setCasesMap(map);
  };

  useEffect(() => {
    loadFollowUps();
  }, []);

  const handleCompleteSubmit = async () => {
    if (!completeTarget) return;

    await db.follow_ups.update(completeTarget.id, {
      status: "Completed",
      outcome: outcomeNotes.trim() || "Completed during routine follow-up visit.",
      version: completeTarget.version + 1,
      synced: false
    });

    await syncManager.enqueueOperation("follow_up", completeTarget.id, "update", completeTarget.version, {
      status: "Completed",
      outcome: outcomeNotes.trim()
    });

    setCompleteTarget(null);
    setOutcomeNotes("");
    await loadFollowUps();
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTarget) return;
    setRescheduleError(null);

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!newDueDate || newDueDate < todayStr) {
      setRescheduleError("Rescheduled date cannot be in the past.");
      return;
    }

    if (!rescheduleReason.trim()) {
      setRescheduleError("A reason is mandatory when rescheduling a visit.");
      return;
    }

    await db.follow_ups.update(rescheduleTarget.id, {
      rescheduled_from: rescheduleTarget.due_date,
      due_date: newDueDate,
      status: "Rescheduled",
      notes: `Rescheduled: ${rescheduleReason.trim()}.`,
      version: rescheduleTarget.version + 1,
      synced: false
    });

    await syncManager.enqueueOperation("follow_up", rescheduleTarget.id, "update", rescheduleTarget.version, {
      rescheduled_to: newDueDate,
      reschedule_reason: rescheduleReason.trim()
    });

    setRescheduleTarget(null);
    setNewDueDate("");
    setRescheduleReason("");
    await loadFollowUps();
  };

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
          {t("follow_ups.title")}
        </h1>
        <p className="text-xs text-textSecondary mt-0.5">
          Schedule and record follow-through on routine ANC, blood pressure checks, and referral outcomes.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {followUps.length === 0 ? (
          <div className="py-12 text-center text-xs text-textSecondary">
            No scheduled follow-up visits found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {followUps.map((fu) => {
              const c = casesMap[fu.case_id];
              const isOverdue = fu.status === "Pending" && fu.due_date < new Date().toISOString().slice(0, 10);

              return (
                <div key={fu.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      fu.status === "Completed"
                        ? "bg-teal-950/60 text-teal-400"
                        : isOverdue
                        ? "bg-red-950/60 text-red-400"
                        : "bg-surfaceHover text-textSecondary"
                    }`}>
                      <Calendar className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-textPrimary">{c?.first_name || "Beneficiary"}</span>
                        <span className="text-xs font-mono text-brand font-semibold">{c?.case_code}</span>
                      </div>
                      <span className="text-xs text-textSecondary block mt-0.5">
                        Due: <strong>{fu.due_date}</strong> {isOverdue && <span className="text-red-400 font-bold ml-1">(Overdue)</span>} • {fu.type}
                      </span>
                      {fu.outcome && <span className="text-[11px] text-teal-300 block mt-1">Outcome: {fu.outcome}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <StatusBadge type="status" value={fu.status} />

                    {fu.status !== "Completed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCompleteTarget(fu)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-sm"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleTarget(fu);
                            setNewDueDate(fu.due_date);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border hover:bg-surfaceHover text-textSecondary hover:text-textPrimary transition-all"
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complete Modal */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-textPrimary mb-2">Mark Follow-up as Completed</h3>
            <p className="text-xs text-textSecondary mb-4">
              Enter any observation notes or clinical outcomes documented during this home visit:
            </p>
            <textarea
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="e.g. Beneficiary visited PHC, prescribed IFA tablets, BP normal..."
              rows={3}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-textPrimary focus:outline-none focus:border-brand resize-none mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-textSecondary hover:bg-surfaceHover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSubmit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-textPrimary mb-2">Reschedule Follow-up Visit</h3>
            {rescheduleError && (
              <div className="p-3 mb-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300">
                {rescheduleError}
              </div>
            )}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1">New Target Date *</label>
                <input
                  type="date"
                  value={newDueDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1">Reason for Rescheduling *</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Family away at relative's home, monsoon road blocked..."
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-textSecondary hover:bg-surfaceHover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleSubmit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white"
              >
                Update Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
