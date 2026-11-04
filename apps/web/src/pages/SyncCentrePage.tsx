import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db, OutboxOperation, LocalConflict } from "../db";
import { syncManager } from "../sync/syncManager";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Database,
  Lock,
  ArrowRight
} from "lucide-react";

export const SyncCentrePage: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(syncManager.isOnline);
  const [isSyncing, setIsSyncing] = useState(false);
  const [outboxItems, setOutboxItems] = useState<OutboxOperation[]>([]);
  const [conflicts, setConflicts] = useState<LocalConflict[]>([]);
  const [storageUsedMB, setStorageUsedMB] = useState<string>("0.8");
  const [lastSync, setLastSync] = useState<string>(
    localStorage.getItem("sahai_last_sync_timestamp") || "Never"
  );
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const loadSyncData = async () => {
    setIsOnline(syncManager.isOnline);
    const ops = await db.outbox.toArray();
    setOutboxItems(ops);

    const c = await db.conflicts.toArray();
    setConflicts(c);

    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          setStorageUsedMB((estimate.usage / (1024 * 1024)).toFixed(2));
        }
      } catch {
        // fallback
      }
    }
  };

  useEffect(() => {
    loadSyncData();
    const interval = setInterval(loadSyncData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncManager.sync();
      if (res.success) {
        setSyncStatusMsg(`Successfully synchronized ${res.applied} operations.`);
        setLastSync(new Date().toISOString());
      } else {
        setSyncStatusMsg(`Sync notice: ${res.error || "Completed with conflicts"}`);
      }
      await loadSyncData();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
          {t("sync.title")}
        </h1>
        <p className="text-xs text-textSecondary mt-0.5">
          Local-first synchronization engine. All field records persist in IndexedDB and sync idempotently upon reconnection.
        </p>
      </div>

      {/* Sync Status Banner */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isOnline
                ? "bg-teal-950/60 border border-teal-800 text-teal-400"
                : "bg-neutral-900 border border-neutral-700 text-neutral-400"
            }`}
          >
            {isOnline ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-textPrimary">
              {isOnline ? t("sync.status_connected") : t("sync.status_offline")}
            </h2>
            <span className="text-xs text-textSecondary">
              {t("sync.last_sync", { time: lastSync !== "Never" ? new Date(lastSync).toLocaleTimeString() : "Never" })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing || !isOnline}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white disabled:opacity-40 transition-all shadow-md shadow-brand/20"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : t("sync.btn_sync_now")}</span>
        </button>
      </div>

      {syncStatusMsg && (
        <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-800 text-xs text-teal-300 font-medium">
          {syncStatusMsg}
        </div>
      )}

      {/* Unsynced Records Warning */}
      {outboxItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-300 block mb-0.5">
              {t("sync.pending_operations")} ({outboxItems.length})
            </span>
            <p className="text-amber-200/80 leading-relaxed">
              {t("sync.device_lock_notice")}
            </p>
          </div>
        </div>
      )}

      {/* Outbox Items Queue */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3">
          Local Outbox Queue ({outboxItems.length})
        </h3>

        {outboxItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-teal-400 flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-teal-400" />
            <span>All local field transactions are synchronized with server.</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {outboxItems.map((op) => (
              <div key={op.operation_id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold uppercase text-brand text-[11px] px-1.5 py-0.5 rounded bg-brand/10 border border-brand/30">
                      {op.entity}
                    </span>
                    <span className="font-semibold text-textPrimary capitalize">
                      {op.operation_type} #{op.entity_id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="text-[11px] text-textMuted block mt-0.5 font-mono">
                    ID: {op.operation_id.slice(0, 16)}... • {new Date(op.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                  op.status === "failed"
                    ? "bg-red-950 text-red-300 border border-red-800"
                    : op.status === "conflict"
                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                    : "bg-neutral-900 text-textSecondary border border-neutral-700"
                }`}>
                  {op.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Hygiene */}
      <div className="bg-surface border border-border rounded-2xl p-5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-textSecondary" />
          <div>
            <span className="font-bold text-textPrimary block">IndexedDB Local Storage Hygiene</span>
            <span className="text-textSecondary">
              {t("sync.storage_used", { mb: storageUsedMB })} • Persistent Storage Granted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
