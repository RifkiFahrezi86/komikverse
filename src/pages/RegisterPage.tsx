import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const pwChecks = [
    { label: "Minimal 6 karakter", ok: password.length >= 6 },
    { label: "Huruf dan angka", ok: /[a-zA-Z]/.test(password) && /\d/.test(password) },
    { label: "Password cocok", ok: password.length > 0 && password === confirmPw },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPw) { setError("Password tidak cocok"); return; }
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white/85 tracking-tight">
            Komik<span className="text-[#f97316]">Verse</span>
          </span>
        </Link>

        <div className="bg-[#12121a] rounded-xl border border-white/[0.06] p-6">
          <h1 className="font-display text-lg text-white/85 font-bold mb-1">Daftar</h1>
          <p className="text-xs text-[#5c5c6e] font-body mb-5">Buat akun KomikVerse baru</p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                placeholder="username_keren"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                placeholder="email@contoh.com"
                required
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
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5c6e] hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Konfirmasi Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                placeholder="••••••"
                required
              />
            </div>

            {/* Password strength */}
            {password && (
              <div className="space-y-1">
                {pwChecks.map((c) => (
                  <div key={c.label} className="flex items-center gap-1.5 text-[10px] font-body">
                    {c.ok ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-[#5c5c6e]" />}
                    <span className={c.ok ? "text-emerald-400" : "text-[#5c5c6e]"}>{c.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pwChecks.every((c) => c.ok)}
              className="w-full py-2.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-body font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Daftar
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[#5c5c6e] font-body">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-[#f97316] hover:underline font-medium">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
