import React from "react";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "./StatusBadge";
import { AlertCircle, HelpCircle } from "lucide-react";

interface Props {
  score: number;
  completeness: number;
  lowerBound: number;
  upperBound: number;
  band: string;
  className?: string;
}

export const ScoreGauge: React.FC<Props> = ({
  score,
  completeness,
  lowerBound,
  upperBound,
  band,
  className = ""
}) => {
  const { t } = useTranslation();
  const completenessPercent = Math.round(completeness * 100);

  // Band color indicator
  const getBandColor = () => {
    switch (band) {
      case "lower":
        return "text-teal-400";
      case "moderate":
        return "text-amber-400";
      case "elevated":
        return "text-orange-400";
      case "priority":
        return "text-pink-400";
      default:
        return "text-neutral-400";
    }
  };

  return (
    <div className={`bg-surface border border-border rounded-xl p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
          {t("mvi.overall_score")}
        </span>
        <StatusBadge type="band" value={band} />
      </div>

      <div className="my-4 flex items-baseline gap-3">
        <span className={`text-5xl font-black tracking-tight ${getBandColor()}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-textSecondary">/ 100</span>
      </div>

      {/* Uncertainty Range */}
      <div className="bg-background/80 border border-border/60 rounded-lg p-2.5 mb-3">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-textSecondary flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Uncertainty Range:
          </span>
          <span className="font-semibold text-textPrimary">
            {lowerBound.toFixed(1)} – {upperBound.toFixed(1)}
          </span>
        </div>
        {/* Visual range bar */}
        <div className="relative w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-brand/60 rounded-full"
            style={{
              left: `${Math.max(0, lowerBound)}%`,
              width: `${Math.max(2, upperBound - lowerBound)}%`
            }}
          />
        </div>
      </div>

      {/* Completeness Bar */}
      <div>
        <div className="flex justify-between items-center text-xs text-textSecondary mb-1">
          <span>{t("mvi.completeness", { percent: completenessPercent })}</span>
          <span className="font-medium text-textPrimary">{completenessPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              completenessPercent < 60 ? "bg-amber-500" : "bg-teal-500"
            }`}
            style={{ width: `${completenessPercent}%` }}
          />
        </div>
        {completenessPercent < 60 && (
          <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {t("mvi.incomplete_warning")}
          </p>
        )}
      </div>

      <p className="text-[10px] text-textMuted mt-4 leading-tight italic">
        * {t("mvi.disclaimer")}
      </p>
    </div>
  );
};
