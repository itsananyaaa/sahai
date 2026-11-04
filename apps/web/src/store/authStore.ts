import { create } from "zustand";
import { apiFetch } from "../api/client";
import i18n from "../i18n";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "asha" | "anm_phc" | "district_admin";
  preferred_language: string;
  facility_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: "asha" | "anm_phc" | "district_admin") => Promise<void>;
  logout: () => Promise<void>;
  lock: () => void;
  unlock: (pin: string) => boolean;
  initSession: () => void;
}

const DEMO_CREDENTIALS = {
  asha: { email: "asha.sarala@sahai.demo", password: "demo1234", defaultLang: "ml" },
  anm_phc: { email: "anm.priya@sahai.demo", password: "demo1234", defaultLang: "en" },
  district_admin: { email: "admin.rajesh@sahai.demo", password: "demo1234", defaultLang: "hi" }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("sahai_auth_token"),
  isAuthenticated: false,
  isLocked: false,
  isLoading: false,
  error: null,

  initSession: () => {
    const cachedUser = localStorage.getItem("sahai_cached_user");
    const token = localStorage.getItem("sahai_auth_token");
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        set({ user, token, isAuthenticated: true });
        if (user.preferred_language) {
          i18n.changeLanguage(user.preferred_language);
        }
      } catch {
        localStorage.removeItem("sahai_cached_user");
      }
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res: any = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      if (res.access_token) {
        localStorage.setItem("sahai_auth_token", res.access_token);
      } else {
        localStorage.removeItem("sahai_auth_token");
      }
      localStorage.setItem("sahai_cached_user", JSON.stringify(res.user));

      if (res.user.preferred_language) {
        i18n.changeLanguage(res.user.preferred_language);
      }

      set({
        user: res.user,
        token: res.access_token,
        isAuthenticated: true,
        isLoading: false,
        isLocked: false
      });
    } catch (err: any) {
      set({ error: err.message || "Login failed", isLoading: false });
      throw err;
    }
  },

  loginAsDemo: async (role) => {
    const creds = DEMO_CREDENTIALS[role];
    await get().login(creds.email, creds.password);
  },

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout request failed, clearing local state", e);
    }
    localStorage.removeItem("sahai_auth_token");
    localStorage.removeItem("sahai_cached_user");
    set({ user: null, token: null, isAuthenticated: false, isLocked: false });
  },

  lock: () => {
    set({ isLocked: true });
  },

  unlock: (pin: string) => {
    // Demo PIN unlock: "1234"
    if (pin === "1234") {
      set({ isLocked: false });
      return true;
    }
    return false;
  }
}));
