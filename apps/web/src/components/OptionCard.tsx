import React from "react";
import { Check } from "lucide-react";

interface Props {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  className?: string;
}

export const OptionCard: React.FC<Props> = ({
  selected,
  onSelect,
  title,
  subtitle,
  badge,
  className = ""
}) => {
  return (
    <div
      onClick={onSelect}
      className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
        selected
          ? "bg-surfaceHover border-brand ring-1 ring-brand/50 shadow-md shadow-brand/10"
          : "bg-surface border-border hover:border-textSecondary/40 hover:bg-surfaceHover/60"
      } ${className}`}
      role="radio"
      aria-checked={selected}
    >
      <div
        className={`w-5 h-5 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center border transition-all ${
          selected ? "bg-brand border-brand text-white" : "border-border bg-background"
        }`}
      >
        {selected && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-textPrimary leading-snug">{title}</span>
          {badge && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-textSecondary mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
};
