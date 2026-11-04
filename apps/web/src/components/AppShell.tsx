import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SyncPill } from "./SyncPill";
import {
  HeartPulse,
  Home,
  Users,
  Calendar,
  Share2,
  Clock,
  Cloud,
  BarChart3,
  Settings,
  LogOut,
  Lock,
  Menu,
  X,
  AlertTriangle,
  KeyRound
} from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export const AppShell: React.FC<Props> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, lock, isLocked, unlock } = useAuthStore();
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = user?.role || "asha";

  // Role-specific navigation items
  const navItems = [
    { to: "/", label: t("nav.home"), icon: Home, roles: ["asha", "anm_phc", "district_admin"] },
    { to: "/cases", label: t("nav.cases"), icon: Users, roles: ["asha", "anm_phc"] },
    { to: "/referrals", label: t("nav.referrals"), icon: Share2, roles: ["asha", "anm_phc"] },
    { to: "/follow-ups", label: t("nav.follow_ups"), icon: Clock, roles: ["asha", "anm_phc"] },
    { to: "/sync", label: t("nav.sync"), icon: Cloud, roles: ["asha", "anm_phc", "district_admin"] },
    { to: "/analytics", label: t("nav.analytics"), icon: BarChart3, roles: ["district_admin", "anm_phc"] },
    { to: "/settings", label: t("nav.settings"), icon: Settings, roles: ["asha", "anm_phc", "district_admin"] }
  ].filter((item) => item.roles.includes(role));

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlock(pinInput)) {
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Lock Screen Modal
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background">
        <div className="max-w-sm w-full bg-surface border border-border rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-textPrimary">App Locked</h2>
          <p className="text-xs text-textSecondary mt-1 mb-6">
            Enter your local PIN to resume. (Demo PIN: <strong>1234</strong>)
          </p>

          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-textSecondary absolute left-3 top-3.5" />
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="4-digit PIN"
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-center text-lg tracking-widest font-mono text-textPrimary focus:outline-none focus:border-brand"
                autoFocus
              />
            </div>
            {pinError && <span className="text-xs text-red-400">Incorrect PIN. Use 1234.</span>}

            <button
              type="submit"
              className="w-full py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold text-sm transition-all"
            >
              Unlock
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-textMuted hover:text-textSecondary mt-2"
            >
              Sign Out Instead
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-textPrimary">
      {/* Persistent Demo Marker Banner */}
      <div className="bg-brand/10 border-b border-brand/20 px-3 py-1 flex items-center justify-between text-[11px] font-medium text-brand">
        <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-brand" />
          <span className="truncate">{t("demo_banner")}</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand/20 text-brand ml-2 flex-shrink-0">
          {t("common.synthetic_tag")}
        </span>
      </div>

      {/* Translation Review Notice (Visible when non-English) */}
      {i18n.language !== "en" && (
        <div className="bg-surface border-b border-border px-3 py-1 text-center text-[11px] text-amber-300">
          {t("translation_review_notice")}
        </div>
      )}

      {/* Main Header / TopBar */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/50 flex items-center justify-center text-brand">
              <HeartPulse className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-textPrimary leading-none">
                SahAI
              </span>
              <span className="text-[9px] font-semibold text-textSecondary uppercase tracking-wider">
                {role === "asha" ? t("home.role_asha") : role === "anm_phc" ? t("home.role_anm") : t("home.role_admin")}
              </span>
            </div>
          </Link>

          {/* Quick Context / Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncPill />
            <LanguageSwitcher />

            <button
              onClick={lock}
              title={t("nav.lock")}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surfaceHover text-textSecondary hover:text-textPrimary transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              title={t("nav.logout")}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surfaceHover text-xs text-textSecondary hover:text-textPrimary transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border p-4 gap-1 flex-shrink-0">
          <div className="text-[11px] font-semibold text-textMuted uppercase tracking-wider px-3 py-2">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand text-white shadow-sm shadow-brand/30"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surfaceHover"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-textSecondary"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (from the Liftr fitness UI reference inspiration) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border px-2 py-1 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? "text-brand" : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-brand stroke-[2.5]" : ""}`} />
              <span className="truncate max-w-[54px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
