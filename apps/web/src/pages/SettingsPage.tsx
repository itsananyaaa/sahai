import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { SUPPORTED_LANGUAGES, SupportedLanguageCode } from "../i18n";
import { db } from "../db";
import {
  Settings,
  Globe,
  User,
  Info,
  Shield,
  RotateCcw,
  Check,
  HeartPulse
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleLanguageChange = (code: SupportedLanguageCode) => {
    i18n.changeLanguage(code);
    if (user) {
      user.preferred_language = code;
    }
  };

  const handleResetDemo = async () => {
    await db.cases.clear();
    await db.visits.clear();
    await db.assessments.clear();
    await db.referrals.clear();
    await db.follow_ups.clear();
    await db.outbox.clear();
    await db.conflicts.clear();
    localStorage.removeItem("sahai_last_pull_time");
    setResetDone(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-xs text-textSecondary mt-0.5">
          Configure multilingual presentation, accessibility preferences, and review evidentiary integrity.
        </p>
      </div>

      {/* Language Preferences Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand" />
          {t("settings.language_prefs")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = i18n.language.slice(0, 2) === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                  isSelected
                    ? "bg-surfaceHover border-brand ring-1 ring-brand/50 shadow-sm"
                    : "bg-background/80 border-border hover:bg-surfaceHover/60"
                }`}
              >
                <div>
                  <span className="text-sm font-bold text-textPrimary block">{lang.nativeName}</span>
                  <span className="text-xs text-textSecondary">{lang.name} ({lang.script})</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-brand" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active User Session */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-brand" />
          {t("settings.session_info")}
        </h2>

        <div className="text-xs text-textSecondary space-y-1.5 font-mono">
          <p>
            User: <strong className="text-textPrimary">{user?.full_name}</strong>
          </p>
          <p>
            Role: <strong className="text-textPrimary uppercase">{user?.role}</strong>
          </p>
          <p>
            Email: <strong className="text-textPrimary">{user?.email}</strong>
          </p>
          <p>
            Offline Persistence: <strong className="text-teal-400">IndexedDB Enabled</strong>
          </p>
        </div>
      </div>

      {/* About SahAI & Pitch Framing */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand/20 text-brand flex items-center justify-center">
            <HeartPulse className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            {t("settings.about_sahai")}
          </h2>
        </div>

        <p className="text-xs text-textSecondary leading-relaxed">
          {t("settings.pitch_framing")}
        </p>

        <div className="p-3.5 rounded-xl bg-background/80 border border-border text-xs text-textMuted space-y-2">
          <span className="font-semibold text-textSecondary uppercase tracking-wider block text-[10px]">
            Citations from Pitch Deck (Verification Status)
          </span>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>SRS Special Bulletin 2019–21 (Registrar General of India): India National MMR 97-103.</li>
            <li>UN MMEIG Report (April 2025): 86% global/regional reduction trend.</li>
            <li>Million Death Study (2021 peer-reviewed analysis): Regional gap & detection disparities.</li>
            <li>Three Delays Model (Thaddeus & Maine): Delay 1 (Seeking care), Delay 2 (Reaching care), Delay 3 (Receiving quality care).</li>
          </ul>
        </div>
      </div>

      {/* Reset Demo State Button */}
      <div className="bg-surface border border-red-950 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
            Reset Demo Environment
          </span>
          <p className="text-xs text-textSecondary mt-0.5">
            Wipes local IndexedDB cache and outbox. Refreshes application to clean state.
          </p>
        </div>

        {resetDone ? (
          <span className="text-xs text-teal-400 font-bold">Reset Complete! Reloading...</span>
        ) : !resetConfirm ? (
          <button
            type="button"
            onClick={() => setResetConfirm(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-700 hover:border-red-600 text-textSecondary hover:text-red-400 transition-colors"
          >
            {t("settings.clear_cache")}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setResetConfirm(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-textMuted hover:text-textSecondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
            >
              Confirm Wipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
