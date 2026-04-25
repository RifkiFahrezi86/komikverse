import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import { getReadingStats } from "./history";
import { syncStreak } from "./api";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
// Remove trailing /api to get base URL for auth endpoints
const AUTH_BASE = API_BASE.replace(/\/api\/?$/, "/api");
const EMERGENCY_ADMIN_TOKEN = "__kv_emergency_admin__";
const EMERGENCY_ADMIN_USERNAME = String(import.meta.env.VITE_EMERGENCY_ADMIN_USERNAME || "").trim();
const EMERGENCY_ADMIN_PASSWORD = String(import.meta.env.VITE_EMERGENCY_ADMIN_PASSWORD || "");
const EMERGENCY_ADMIN_EMAIL = String(import.meta.env.VITE_EMERGENCY_ADMIN_EMAIL || "").trim();

export interface User {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin" | "owner";
  avatar_url?: string;
  ad_free?: boolean;
  ad_free_until?: string;
  current_streak?: number;
  longest_streak?: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
  isOwner: boolean;
  isAdFree: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("kv_token");
  let res: Response;
  try {
    res = await fetch(`${AUTH_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // Network error (offline, DNS failure, timeout) — do NOT treat as auth failure
    throw new Error("Network error");
  }
  const data = await res.json();
  if (!res.ok) throw new AuthError(data.error || "Request failed", res.status);
  return data;
}

function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

function canUseEmergencyAdmin(login: string, password: string, err: unknown) {
  if (!EMERGENCY_ADMIN_USERNAME || !EMERGENCY_ADMIN_PASSWORD) return false;

  const serverUnavailable =
    (err instanceof AuthError && (err.status === 429 || err.status >= 500)) ||
    (err instanceof Error && err.message === "Network error");

  if (!serverUnavailable || password !== EMERGENCY_ADMIN_PASSWORD) return false;

  const normalizedLogin = normalizeLogin(login);
  return normalizedLogin === normalizeLogin(EMERGENCY_ADMIN_USERNAME)
    || (!!EMERGENCY_ADMIN_EMAIL && normalizedLogin === normalizeLogin(EMERGENCY_ADMIN_EMAIL));
}

function createEmergencyAdminUser(): User {
  return {
    id: -1,
    username: EMERGENCY_ADMIN_USERNAME || "admin",
    email: EMERGENCY_ADMIN_EMAIL || `${EMERGENCY_ADMIN_USERNAME || "admin"}@local`,
    role: "admin",
    ad_free: true,
    created_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("kv_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("kv_token"));
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("kv_user", JSON.stringify(nextUser));
    localStorage.setItem("kv_token", nextToken);
  }, []);

  // Validate session on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    if (token === EMERGENCY_ADMIN_TOKEN) {
      if (!user) {
        setToken(null);
        localStorage.removeItem("kv_user");
        localStorage.removeItem("kv_token");
      }
      setLoading(false);
      return;
    }
    authFetch("/auth/me")
      .then((data) => {
        persistSession(data.user, data.token || token);
        // Auto-refresh token if server returns a new one
        if (data.token) {
          setToken(data.token);
          localStorage.setItem("kv_token", data.token);
        }
        // Sync streak to server on every app load — use MAX of local vs server
        try {
          const s = getReadingStats();
          const serverStreak = data.user?.current_streak || 0;
          const serverLongest = data.user?.longest_streak || 0;
          const bestCurrent = Math.max(s.currentStreak, serverStreak);
          const bestLongest = Math.max(s.longestStreak, serverLongest);
          const today = new Date();
          const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          syncStreak(bestCurrent, bestLongest, dateStr);
        } catch { /* ignore */ }
      })
      .catch((err) => {
        // Only logout on explicit 401/403 from server (expired/invalid token)
        if (err instanceof AuthError && (err.status === 401 || err.status === 403)) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("kv_user");
          localStorage.removeItem("kv_token");
        }
        // Network errors: keep user logged in with cached localStorage data
      })
      .finally(() => setLoading(false));
  }, [persistSession, token, user]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await authFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      persistSession(data.user, data.token);
      return data.user;
    } catch (err) {
      if (canUseEmergencyAdmin(username, password, err)) {
        const emergencyUser = createEmergencyAdminUser();
        persistSession(emergencyUser, EMERGENCY_ADMIN_TOKEN);
        return emergencyUser;
      }
      throw err;
    }
  }, [persistSession]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const data = await authFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    persistSession(data.user, data.token);
    return data.user;
  }, [persistSession]);

  const logout = useCallback(() => {
    if (token !== EMERGENCY_ADMIN_TOKEN) {
      authFetch("/auth/logout", { method: "POST" }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("kv_user");
    localStorage.removeItem("kv_token");
  }, [token]);

  const value = useMemo(() => ({
    user, token, loading, login, register, logout,
    isAdmin: user?.role === "admin" || user?.role === "owner",
    isOwner: user?.role === "owner",
    isAdFree: user?.role === "admin" || user?.role === "owner" || user?.ad_free === true || (!!user?.ad_free_until && new Date(user.ad_free_until) > new Date()),
  }), [user, token, loading, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
