import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
// Remove trailing /api to get base URL for auth endpoints
const AUTH_BASE = API_BASE.replace(/\/api\/?$/, "/api");

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
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isOwner: boolean;
  isAdFree: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("kv_token");
  const res = await fetch(`${AUTH_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
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

  // Validate session on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    authFetch("/auth/me")
      .then((data) => {
        setUser(data.user);
        localStorage.setItem("kv_user", JSON.stringify(data.user));
      })
      .catch(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("kv_user");
        localStorage.removeItem("kv_token");
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (username: string, password: string) => {
    const data = await authFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("kv_user", JSON.stringify(data.user));
    localStorage.setItem("kv_token", data.token);
  };

  const register = async (username: string, email: string, password: string) => {
    const data = await authFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("kv_user", JSON.stringify(data.user));
    localStorage.setItem("kv_token", data.token);
  };

  const logout = () => {
    authFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem("kv_user");
    localStorage.removeItem("kv_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.role === "admin" || user?.role === "owner", isOwner: user?.role === "owner", isAdFree: user?.role === "admin" || user?.role === "owner" || user?.ad_free === true || (!!user?.ad_free_until && new Date(user.ad_free_until) > new Date()) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
