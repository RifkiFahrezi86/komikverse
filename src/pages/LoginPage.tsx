import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fromPath = typeof location.state === "object" && location.state && "from" in location.state
    ? ((location.state as { from?: { pathname?: string } }).from?.pathname || "")
    : "";
  const redirectPath = fromPath || (user?.role === "admin" || user?.role === "owner" ? "/admin" : "/");

  // Redirect if already logged in
  if (user) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const nextUser = await login(username.trim(), password);
      navigate(fromPath || (nextUser.role === "admin" || nextUser.role === "owner" ? "/admin" : "/"), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white/85 tracking-tight">
            Komik<span className="text-[#f97316]">Verse</span>
          </span>
        </Link>

        <div className="bg-[#12121a] rounded-xl border border-white/[0.06] p-6">
          <h1 className="font-display text-lg text-white/85 font-bold mb-1">Masuk</h1>
          <p className="text-xs text-[#5c5c6e] font-body mb-5">Masuk ke akun KomikVerse kamu</p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Username atau Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                placeholder="username atau email"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                  placeholder="••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5c6e] hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-body font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Masuk
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[#5c5c6e] font-body">
            Belum punya akun?{" "}
            <Link to="/register" className="text-[#f97316] hover:underline font-medium">
              Daftar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
