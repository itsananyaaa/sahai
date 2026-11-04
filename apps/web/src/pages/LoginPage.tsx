import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { HeartPulse, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loginAsDemo, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch {
      // Error is set in store
    }
  };

  const handleDemoClick = async (role: "asha" | "anm_phc" | "district_admin") => {
    await loginAsDemo(role);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 text-textPrimary">
      {/* Top language selector */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/50 flex items-center justify-center text-brand">
            <HeartPulse className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-black text-xl tracking-tight">SahAI</span>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black tracking-tight text-textPrimary">
            {t("auth.title")}
          </h1>
          <p className="text-xs text-textSecondary mt-1 leading-relaxed">
            {t("auth.subtitle")}
          </p>
        </div>

        {/* Demo Accounts Quick Access */}
        <div className="bg-background/80 border border-border rounded-xl p-4 mb-6">
          <span className="text-xs font-bold text-textSecondary uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-brand" />
            {t("auth.demo_accounts_title")}
          </span>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleDemoClick("asha")}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-surface border border-border hover:border-brand hover:bg-surfaceHover text-textPrimary flex items-center justify-between transition-all"
            >
              <span>{t("auth.demo_asha_button")}</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand" />
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick("anm_phc")}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-surface border border-border hover:border-brand hover:bg-surfaceHover text-textPrimary flex items-center justify-between transition-all"
            >
              <span>{t("auth.demo_phc_button")}</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand" />
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick("district_admin")}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-surface border border-border hover:border-brand hover:bg-surfaceHover text-textPrimary flex items-center justify-between transition-all"
            >
              <span>{t("auth.demo_admin_button")}</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand" />
            </button>
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-textMuted text-[11px] uppercase tracking-wider font-semibold">
            Or standard credentials
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              {t("auth.email")}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-textSecondary absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="worker@sahai.demo"
                className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-textSecondary absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-brand hover:bg-brand-hover text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-brand/20 disabled:opacity-50"
          >
            {isLoading ? t("auth.signing_in") : t("auth.sign_in")}
          </button>
        </form>
      </div>

      {/* Footer Disclaimer */}
      <footer className="text-center text-[11px] text-textMuted max-w-md mx-auto leading-relaxed">
        <p className="flex items-center justify-center gap-1.5 mb-1 font-semibold text-textSecondary">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          Offline-First DPDP-Aligned Frontline Prototype
        </p>
        <p>Built for Agentic AI Hackathon 2026. Alvino P Shatto, Ananya Biju, Ann Sani.</p>
      </footer>
    </div>
  );
};
