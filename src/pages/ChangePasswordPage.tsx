import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { useAuth } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const AUTH_BASE = API_BASE.replace(/\/api\/?$/, "/api");

export default function ChangePasswordPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const pwChecks = [
    { label: "Minimal 6 karakter", ok: newPw.length >= 6 },
    { label: "Berbeda dari password lama", ok: newPw.length > 0 && newPw !== currentPw },
    { label: "Password baru cocok", ok: newPw.length > 0 && newPw === confirmPw },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPw !== confirmPw) { setError("Password baru tidak cocok"); return; }
    if (newPw.length < 6) { setError("Password minimal 6 karakter"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
      setSuccess("Password berhasil diubah!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password");
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
          <div className="flex items-center gap-2 mb-1">
            <Lock size={16} className="text-[#f97316]" />
            <h1 className="font-display text-lg text-white/85 font-bold">Ganti Password</h1>
          </div>
          <p className="text-xs text-[#5c5c6e] font-body mb-5">Masukkan password lama dan password baru</p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-body">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Password Lama</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                  placeholder="••••••"
                  required
                  autoFocus
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5c6e] hover:text-white">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Password Baru</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                  placeholder="••••••"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5c6e] hover:text-white">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-[#8e8ea0] mb-1.5">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                placeholder="••••••"
                required
              />
            </div>

            {newPw && (
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
              Ubah Password
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[#5c5c6e] font-body">
            <Link to="/" className="text-[#f97316] hover:underline font-medium">
              Kembali ke Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
