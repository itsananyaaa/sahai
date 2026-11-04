import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertTriangle, AlertCircle, AlertOctagon, HelpCircle } from "lucide-react";

interface Props {
  type: "band" | "priority" | "status";
  value: string;
  className?: string;
}

export const StatusBadge: React.FC<Props> = ({ type, value, className = "" }) => {
  const { t } = useTranslation();

  if (type === "band") {
    switch (value) {
      case "lower":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-950/60 border border-teal-800 text-teal-300 ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("bands.band_lower")}
          </span>
        );
      case "moderate":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-800 text-amber-300 ${className}`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {t("bands.band_moderate")}
          </span>
        );
      case "elevated":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/60 border border-orange-800 text-orange-300 ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("bands.band_elevated")}
          </span>
        );
      case "priority":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-950/70 border border-pink-700 text-pink-300 ${className}`}>
            <AlertOctagon className="w-3.5 h-3.5" />
            {t("bands.band_priority")}
          </span>
        );
      case "incomplete_provisional":
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 border border-neutral-700 text-neutral-300 ${className}`}>
            <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
            {t("bands.band_incomplete_provisional")}
          </span>
        );
    }
  }

  if (type === "priority") {
    switch (value) {
      case "Urgent":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 border border-red-600 text-red-200 animate-pulse ${className}`}>
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            {t("referrals.priority_urgent")}
          </span>
        );
      case "Priority":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/60 border border-orange-800 text-orange-300 ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("referrals.priority_priority")}
          </span>
        );
      case "Routine":
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-700 text-neutral-300 ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
            {t("referrals.priority_routine")}
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-900 border border-neutral-800 text-textSecondary ${className}`}>
      {value}
    </span>
  );
};
