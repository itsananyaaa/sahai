import React, { useState, useEffect } from "react";
import { syncManager } from "../sync/syncManager";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export const SyncPill: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(syncManager.isOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const update = async () => {
      setIsOnline(syncManager.isOnline);
      const count = await syncManager.getPendingCount();
      setPendingCount(count);
    };

    update();
    const interval = setInterval(update, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await syncManager.sync();
      const count = await syncManager.getPendingCount();
      setPendingCount(count);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleManualSync}
      disabled={isSyncing}
      title={isOnline ? "Click to synchronize pending records" : "Working offline"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        isOnline
          ? pendingCount > 0
            ? "bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/50"
            : "bg-teal-950/40 border-teal-800 text-teal-300 hover:bg-teal-900/50"
          : "bg-neutral-900 border-neutral-700 text-neutral-400"
      }`}
    >
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" />
      ) : isOnline ? (
        <Cloud className="w-3.5 h-3.5" />
      ) : (
        <CloudOff className="w-3.5 h-3.5" />
      )}
      <span>{isOnline ? (pendingCount > 0 ? `${pendingCount} ${t("home.stat_sync_pending")}` : t("home.online_badge")) : t("home.offline_badge")}</span>
    </button>
  );
};
