import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
  value: string;
  onChange: (val: string) => void;
  label: string;
  description?: string;
  options?: Array<{ key: string; labelKey: string }>;
  className?: string;
}

export const TriStateField: React.FC<Props> = ({
  value,
  onChange,
  label,
  description,
  options = [
    { key: "yes", labelKey: "common.yes" },
    { key: "no", labelKey: "common.no" },
    { key: "unknown", labelKey: "common.unknown" }
  ],
  className = ""
}) => {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold text-textPrimary">{label}</span>
      {description && <span className="text-xs text-textSecondary">{description}</span>}
      <div className="flex flex-wrap gap-2 mt-1">
        {options.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isSelected
                  ? opt.key === "yes"
                    ? "bg-brand text-white border-brand shadow-sm shadow-brand/40"
                    : "bg-surfaceHover text-textPrimary border-textSecondary"
                  : "bg-surface border-border text-textSecondary hover:text-textPrimary hover:bg-surfaceHover"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
