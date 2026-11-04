import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { db, LocalCase, LocalReferral } from "../db";
import { syncManager } from "../sync/syncManager";
import { StatusBadge } from "../components/StatusBadge";
import {
  Users,
  CalendarPlus,
  Share2,
  RefreshCw,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeCasesCount, setActiveCasesCount] = useState(0);
  const [pendingReferralsCount, setPendingReferralsCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [recentCases, setRecentCases] = useState<LocalCase[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<LocalReferral[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const cases = await db.cases.toArray();
      setActiveCasesCount(cases.filter((c) => c.status === "active").length);
      setRecentCases(cases.slice(0, 4));

      const referrals = await db.referrals.toArray();
      setPendingReferralsCount(referrals.filter((r) => r.status === "Pending" || r.status === "Acknowledged").length);
      setRecentReferrals(referrals.slice(0, 3));

      const syncCount = await syncManager.getPendingCount();
      setPendingSyncCount(syncCount);
    };

    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const role = user?.role || "asha";

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-surface to-surfaceHover border border-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
            {role === "asha" ? t("home.role_asha") : role === "anm_phc" ? t("home.role_anm") : t("home.role_admin")}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-textPrimary mt-1.5">
            {t("home.welcome", { name: user?.full_name || "Care Worker" })}
          </h1>
          <p className="text-xs text-textSecondary mt-0.5">
            Offline-first maternal decision support active. All calculations verified locally.
          </p>
        </div>

        {/* Quick Primary Action */}
        {role === "asha" && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/cases/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20"
            >
              <Plus className="w-4 h-4" />
              <span>{t("home.quick_register_case")}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary">
            <span className="text-xs font-semibold uppercase tracking-wider">{t("home.stat_assigned_cases")}</span>
            <Users className="w-4 h-4 text-brand" />
          </div>
          <span className="text-3xl font-black text-textPrimary mt-3">{activeCasesCount}</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary">
            <span className="text-xs font-semibold uppercase tracking-wider">{t("home.stat_pending_referrals")}</span>
            <Share2 className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-3xl font-black text-textPrimary mt-3">{pendingReferralsCount}</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary">
            <span className="text-xs font-semibold uppercase tracking-wider">{t("home.stat_due_visits")}</span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <span className="text-3xl font-black text-textPrimary mt-3">2</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary">
            <span className="text-xs font-semibold uppercase tracking-wider">{t("home.stat_sync_pending")}</span>
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-black text-textPrimary mt-3">{pendingSyncCount}</span>
        </div>
      </div>

      {/* Quick Action Strip (from mobile reference UI week pill style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/visits/new"
          className="p-4 rounded-xl bg-surface border border-border hover:border-brand/60 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-textPrimary block">{t("home.quick_record_visit")}</span>
              <span className="text-xs text-textSecondary">Structured symptoms & MVI screen</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-textSecondary group-hover:text-brand transition-colors" />
        </Link>

        <Link
          to="/referrals"
          className="p-4 rounded-xl bg-surface border border-border hover:border-brand/60 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-950/40 text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-textPrimary block">{t("nav.referrals")}</span>
              <span className="text-xs text-textSecondary">Track facility triage & outcomes</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-textSecondary group-hover:text-brand transition-colors" />
        </Link>

        <Link
          to="/sync"
          className="p-4 rounded-xl bg-surface border border-border hover:border-brand/60 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950/40 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-textPrimary block">{t("home.quick_sync_now")}</span>
              <span className="text-xs text-textSecondary">Idempotent offline outbox</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-textSecondary group-hover:text-brand transition-colors" />
        </Link>
      </div>

      {/* Recent Cases Section */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            {t("home.recent_activity")}
          </h2>
          <Link to="/cases" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
            <span>{t("cases.filter_all")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentCases.length === 0 ? (
          <div className="py-8 text-center text-xs text-textSecondary">
            {t("cases.no_cases_found")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentCases.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="py-3 flex items-center justify-between gap-3 hover:bg-surfaceHover/50 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-textPrimary">
                    {c.first_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-textPrimary block">{c.first_name}</span>
                    <span className="text-xs text-textSecondary">
                      {c.case_code} • {c.age} yrs • {c.catchment_village}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-textSecondary hidden sm:inline">
                    {c.gestational_age_weeks ? `${c.gestational_age_weeks} wks` : "ANC"}
                  </span>
                  <StatusBadge type="status" value={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
