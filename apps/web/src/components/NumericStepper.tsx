import React from "react";
import { Plus, Minus } from "lucide-react";

interface Props {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

export const NumericStepper: React.FC<Props> = ({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  className = ""
}) => {
  const handleDecrement = () => {
    if (value - step >= min) onChange(value - step);
  };

  const handleIncrement = () => {
    if (value + step <= max) onChange(value + step);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{label}</label>}
      <div className="inline-flex items-center bg-surface border border-border rounded-xl p-1 w-full max-w-[200px] justify-between">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-background border border-border text-textPrimary hover:bg-surfaceHover active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Decrease value"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-lg font-bold text-textPrimary px-3 font-mono">{value}</span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand hover:bg-brand-hover text-white active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Increase value"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
