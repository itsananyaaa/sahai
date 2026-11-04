import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, LocalCase } from "../db";
import { useAuthStore } from "../store/authStore";
import { StatusBadge } from "../components/StatusBadge";
import { Plus, Search, Filter, ArrowRight, UserPlus, HeartPulse } from "lucide-react";

export const CasesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [cases, setCases] = useState<LocalCase[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const loadCases = async () => {
      let list = await db.cases.toArray();
      if (user?.role === "asha") {
        list = list.filter((c) => c.assigned_asha_id === user.id || !c.assigned_asha_id);
      }
      setCases(list);
    };
    loadCases();
  }, [user]);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.case_code.toLowerCase().includes(search.toLowerCase()) ||
      c.catchment_village.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
            {t("cases.registry_title")}
          </h1>
          <p className="text-xs text-textSecondary mt-0.5">
            Active pregnancies and longitudinal assessment tracking in your catchment area.
          </p>
        </div>

        {user?.role === "asha" && (
          <Link
            to="/cases/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-md shadow-brand/20 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t("cases.new_case_button")}</span>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-surface border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("cases.search_placeholder")}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-textSecondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-textPrimary focus:outline-none focus:border-brand"
          >
            <option value="all">{t("cases.filter_all")}</option>
            <option value="active">{t("cases.filter_active")}</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {filteredCases.length === 0 ? (
          <div className="py-12 text-center text-xs text-textSecondary">
            {t("cases.no_cases_found")}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surfaceHover/80 border-b border-border text-textSecondary uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">{t("cases.table_case_code")}</th>
                    <th className="py-3 px-4">{t("cases.table_name")}</th>
                    <th className="py-3 px-4">{t("cases.table_age")}</th>
                    <th className="py-3 px-4">{t("cases.table_gestational_age")}</th>
                    <th className="py-3 px-4">{t("cases.table_village")}</th>
                    <th className="py-3 px-4">{t("cases.table_status")}</th>
                    <th className="py-3 px-4 text-right">{t("cases.table_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="hover:bg-surfaceHover/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand">{c.case_code}</td>
                      <td className="py-3.5 px-4 font-semibold text-textPrimary">{c.first_name}</td>
                      <td className="py-3.5 px-4 text-textSecondary">{c.age} yrs</td>
                      <td className="py-3.5 px-4 text-textSecondary">
                        {c.gestational_age_weeks ? `${c.gestational_age_weeks} wks` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-textSecondary">{c.catchment_village}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge type="status" value={c.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/visits/new?caseId=${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand font-semibold text-[11px]"
                          >
                            {t("cases.record_visit")}
                          </Link>
                          <ArrowRight className="w-4 h-4 text-textSecondary" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-border">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="p-4 flex flex-col gap-2 hover:bg-surfaceHover/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand">{c.case_code}</span>
                      <span className="text-sm font-bold text-textPrimary">{c.first_name}</span>
                    </div>
                    <StatusBadge type="status" value={c.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-textSecondary">
                    <span>
                      {c.age} yrs • {c.catchment_village}
                    </span>
                    <span>{c.gestational_age_weeks ? `${c.gestational_age_weeks} weeks` : "ANC"}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      to={`/visits/new?caseId=${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1 rounded-lg bg-brand/10 border border-brand/30 text-brand text-xs font-bold"
                    >
                      {t("cases.record_visit")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
