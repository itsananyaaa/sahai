import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Table, Eye } from "lucide-react";

interface Props {
  domainScores: Record<string, number | null>;
  className?: string;
}

export const DomainRadar: React.FC<Props> = ({ domainScores, className = "" }) => {
  const { t } = useTranslation();
  const [showTableFallback, setShowTableFallback] = useState(false);

  // Four axes: Top (Clinical), Right (Social), Bottom (Accessibility), Left (Environmental)
  const axes = [
    { key: "clinical", label: t("mvi.domain_clinical"), angle: -Math.PI / 2 },
    { key: "social", label: t("mvi.domain_social"), angle: 0 },
    { key: "accessibility", label: t("mvi.domain_accessibility"), angle: Math.PI / 2 },
    { key: "environmental", label: t("mvi.domain_environmental"), angle: Math.PI }
  ];

  const size = 300;
  const center = size / 2;
  const radius = center - 50;

  // Compute polygon points from domain scores (0-100 scale)
  const polygonPoints = axes
    .map((axis) => {
      const score = domainScores[axis.key] ?? 0;
      const r = (Math.max(0, Math.min(score, 100)) / 100) * radius;
      const x = center + r * Math.cos(axis.angle);
      const y = center + r * Math.sin(axis.angle);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={`flex flex-col items-center bg-surface border border-border rounded-xl p-4 ${className}`}>
      <div className="w-full flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-textPrimary tracking-wide">
          {t("mvi.radar_title")}
        </h3>
        <button
          type="button"
          onClick={() => setShowTableFallback(!showTableFallback)}
          className="inline-flex items-center gap-1 text-xs text-textSecondary hover:text-textPrimary transition-colors"
          title="Toggle Accessible Table View"
        >
          {showTableFallback ? <Eye className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          <span>{showTableFallback ? "Radar View" : "Table View"}</span>
        </button>
      </div>

      {!showTableFallback ? (
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
            {/* Concentric grid circles (25%, 50%, 75%, 100%) */}
            {[0.25, 0.5, 0.75, 1.0].map((level) => (
              <circle
                key={level}
                cx={center}
                cy={center}
                r={radius * level}
                fill="none"
                stroke="#262630"
                strokeWidth="1"
                strokeDasharray={level < 1 ? "3 3" : undefined}
              />
            ))}

            {/* Grid level labels */}
            <text x={center + 4} y={center - radius * 0.5} fill="#6B6B78" fontSize="9">
              50
            </text>
            <text x={center + 4} y={center - radius * 1.0} fill="#6B6B78" fontSize="9">
              100
            </text>

            {/* Crosshair Axes */}
            {axes.map((axis) => {
              const x2 = center + radius * Math.cos(axis.angle);
              const y2 = center + radius * Math.sin(axis.angle);
              return (
                <line
                  key={axis.key}
                  x1={center}
                  y1={center}
                  x2={x2}
                  y2={y2}
                  stroke="#33333F"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Dynamic Vulnerability Polygon */}
            <polygon
              points={polygonPoints}
              fill="rgba(215, 38, 61, 0.28)"
              stroke="#D7263D"
              strokeWidth="2.5"
              className="transition-all duration-500 ease-out"
            />

            {/* Data points */}
            {axes.map((axis) => {
              const score = domainScores[axis.key] ?? 0;
              const r = (Math.max(0, Math.min(score, 100)) / 100) * radius;
              const cx = center + r * Math.cos(axis.angle);
              const cy = center + r * Math.sin(axis.angle);
              return (
                <circle
                  key={`pt-${axis.key}`}
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill="#F4F0EA"
                  stroke="#D7263D"
                  strokeWidth="2"
                />
              );
            })}

            {/* Axis Labels */}
            {axes.map((axis) => {
              const labelR = radius + 24;
              const lx = center + labelR * Math.cos(axis.angle);
              const ly = center + labelR * Math.sin(axis.angle);
              const score = domainScores[axis.key];
              const scoreText = score !== null ? `${score}` : "—";

              return (
                <g key={`lbl-${axis.key}`}>
                  <text
                    x={lx}
                    y={ly - 4}
                    textAnchor="middle"
                    fill="#F4F0EA"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {axis.label.split(" ")[0]}
                  </text>
                  <text
                    x={lx}
                    y={ly + 8}
                    textAnchor="middle"
                    fill={score !== null && score >= 55 ? "#EA580C" : "#9E9EAD"}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {scoreText}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="w-full mt-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-textSecondary">
                <th className="py-2 font-medium">Domain</th>
                <th className="py-2 font-medium text-right">Score (0–100)</th>
                <th className="py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {axes.map((axis) => {
                const score = domainScores[axis.key];
                return (
                  <tr key={axis.key} className="border-b border-border/50">
                    <td className="py-2.5 font-medium text-textPrimary">{axis.label}</td>
                    <td className="py-2.5 text-right font-bold text-textPrimary">
                      {score !== null ? score : "Insufficient Data"}
                    </td>
                    <td className="py-2.5 text-right">
                      {score === null ? (
                        <span className="text-neutral-400">Incomplete</span>
                      ) : score >= 75 ? (
                        <span className="text-pink-400 font-bold">Priority</span>
                      ) : score >= 55 ? (
                        <span className="text-orange-400 font-medium">Elevated</span>
                      ) : score >= 30 ? (
                        <span className="text-amber-400 font-medium">Moderate</span>
                      ) : (
                        <span className="text-teal-400 font-medium">Lower</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
