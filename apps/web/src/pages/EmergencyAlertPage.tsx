import React from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertOctagon, PhoneCall, ArrowRight, ShieldAlert, HeartPulse } from "lucide-react";

export const EmergencyAlertPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const visitId = searchParams.get("visitId") || "";
  const triggersRaw = searchParams.get("triggers") || "";
  const triggers = triggersRaw.split(",").filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Red Alert Card */}
      <div className="bg-red-950/70 border-2 border-red-600 rounded-3xl p-6 sm:p-8 shadow-2xl text-textPrimary relative overflow-hidden">
        {/* Urgent Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider mb-4 animate-pulse">
          <AlertOctagon className="w-4 h-4" />
          <span>{t("emergency.alert_badge")}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
          {t("emergency.title")}
        </h1>

        <p className="text-xs sm:text-sm text-red-100 mt-2 leading-relaxed">
          {t("emergency.explanation")}
        </p>

        {/* Triggers List */}
        <div className="my-6 p-4 rounded-2xl bg-black/50 border border-red-800/80">
          <span className="text-xs font-bold text-red-300 uppercase tracking-wider block mb-2">
            {t("emergency.triggers_detected")}
          </span>
          <div className="flex flex-wrap gap-2">
            {triggers.map((trig) => (
              <span
                key={trig}
                className="px-3 py-1.5 rounded-xl bg-red-900/80 border border-red-500 text-white font-bold text-xs"
              >
                {t(`danger_signs.${trig}`, { defaultValue: trig })}
              </span>
            ))}
          </div>
        </div>

        {/* First Aid & Protocol Guidance */}
        <div className="bg-black/40 border border-red-800/60 rounded-2xl p-4 sm:p-5 mb-6 space-y-3">
          <span className="text-xs font-bold text-red-300 uppercase tracking-wider block">
            {t("emergency.first_aid_action")}
          </span>
          <p className="text-xs text-white leading-relaxed">
            {triggers.includes("convulsions_fits")
              ? t("emergency.guidance_eclampsia")
              : triggers.includes("vaginal_bleeding")
              ? t("emergency.guidance_bleeding")
              : t("emergency.guidance_preeclampsia")}
          </p>

          <div className="p-3 rounded-xl bg-red-900/40 border border-red-700/80 flex items-center gap-3">
            <PhoneCall className="w-5 h-5 text-red-300 flex-shrink-0 animate-bounce" />
            <span className="text-xs font-bold text-white leading-tight">
              {t("emergency.call_108_notice")}
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to={`/referrals/new?caseId=${caseId}&visitId=${visitId}&priority=Urgent&triggers=${encodeURIComponent(triggersRaw)}`}
            className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-xl text-center text-sm font-black bg-white text-red-950 hover:bg-neutral-100 transition-all shadow-lg shadow-black/40 inline-flex items-center justify-center gap-2"
          >
            <span>{t("emergency.btn_create_urgent_referral")}</span>
            <ArrowRight className="w-4 h-4 text-red-900" />
          </Link>

          <button
            type="button"
            onClick={() => navigate(`/cases/${caseId}`)}
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl text-xs font-semibold bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 transition-colors"
          >
            Review Case Record
          </button>
        </div>
      </div>
    </div>
  );
};
