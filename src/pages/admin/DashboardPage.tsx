import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, Clock, Megaphone, Loader2, Database, ShieldCheck, Calendar, Eye, TrendingUp, Trash2, BarChart3 } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface Stats {
  total_users: number;
  total_comments: number;
  pending_comments: number;
  active_ads: number;
  seed_users: number;
}

interface Monthly {
  new_users: number;
  new_comments: number;
  total_views: number;
  tracked_comics: number;
  top_comics: { comic_slug: string; comic_title: string; comic_type: string; view_count: number; weekly_views: number }[];
  daily_activity: { date: string; requests: number; visitors: number }[];
}

interface RecentComment {
  id: number;
  content: string;
  username: string;
  comic_slug: string;
  status: string;
  created_at: string;
  user_role?: string;
}

function formatNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthly, setMonthly] = useState<Monthly | null>(null);
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setMonthly(d.monthly || null);
        setRecentComments(d.recent_comments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleClearMonthly = async () => {
    if (!confirm("Hapus semua data analytics bulan lalu? Data bulan ini tetap aman.")) return;
    setClearing(true);
    try {
      await fetch(`${ADMIN_BASE}/admin/clear-monthly`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch { /* ignore */ }
    setClearing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-[#f97316] animate-spin" />
      </div>
    );
  }

  const currentMonth = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const cards = [
    { label: "Total Pengguna", value: stats?.total_users ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Komentar", value: stats?.total_comments ?? 0, icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Menunggu Review", value: stats?.pending_comments ?? 0, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Iklan Aktif", value: stats?.active_ads ?? 0, icon: Megaphone, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Seed Users", value: stats?.seed_users ?? 0, icon: Database, color: "text-pink-400", bg: "bg-pink-500/10" },
  ];

  const monthlyCards = [
    { label: "User Baru", value: monthly?.new_users ?? 0, icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Komentar Baru", value: monthly?.new_comments ?? 0, icon: MessageSquare, color: "text-lime-400", bg: "bg-lime-500/10" },
    { label: "Total Views", value: formatNum(monthly?.total_views ?? 0), icon: Eye, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Komik Ditrack", value: monthly?.tracked_comics ?? 0, icon: BarChart3, color: "text-rose-400", bg: "bg-rose-500/10" },
  ];

  // Max requests for bar chart scaling
  const maxReq = Math.max(1, ...(monthly?.daily_activity?.map(d => Number(d.requests)) || [1]));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-white/85 mb-5">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.color}`}>
                <c.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-white/85">{c.value}</p>
                <p className="text-[10px] font-body text-[#5c5c6e] uppercase tracking-wider">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly History */}
      {monthly && (
        <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-white/85 flex items-center gap-2">
              <Calendar size={16} className="text-[#f97316]" />
              Catatan {currentMonth}
            </h3>
            <button
              onClick={handleClearMonthly}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Hapus Data Lama
            </button>
          </div>

          {/* Monthly Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {monthlyCards.map((c) => (
              <div key={c.label} className="rounded-lg bg-[#0d0d14] border border-white/[0.03] p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center ${c.color}`}>
                  <c.icon size={16} />
                </div>
                <div>
                  <p className="text-lg font-display font-bold text-white/85">{c.value}</p>
                  <p className="text-[9px] font-body text-[#5c5c6e] uppercase tracking-wider">{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Activity Chart */}
          {monthly.daily_activity && monthly.daily_activity.length > 0 && (
            <div className="mb-5">
              <h4 className="text-xs font-body font-medium text-[#8e8ea0] mb-3 flex items-center gap-1.5">
                <TrendingUp size={12} /> Aktivitas Harian
              </h4>
              <div className="space-y-1.5">
                {monthly.daily_activity.slice(0, 14).map((d) => {
                  const date = new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                  const pct = (Number(d.requests) / maxReq) * 100;
                  return (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="text-[10px] font-body text-[#5c5c6e] w-14 shrink-0 text-right">{date}</span>
                      <div className="flex-1 h-5 bg-[#0d0d14] rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-[#f97316]/60 to-[#f97316] rounded-full transition-all"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-body text-white/60">
                          {formatNum(Number(d.requests))} req · {Number(d.visitors)} visitor
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Comics */}
          {monthly.top_comics && monthly.top_comics.length > 0 && (
            <div>
              <h4 className="text-xs font-body font-medium text-[#8e8ea0] mb-3 flex items-center gap-1.5">
                <Eye size={12} /> Komik Terpopuler
              </h4>
              <div className="space-y-1.5">
                {monthly.top_comics.map((c, i) => (
                  <div key={c.comic_slug} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-body shrink-0 ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-400" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-orange-600/20 text-orange-400" : "bg-white/[0.05] text-[#5c5c6e]"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body font-medium text-white/85 truncate">{c.comic_title || c.comic_slug}</p>
                      <p className="text-[9px] font-body text-[#5c5c6e]">{c.comic_type || "Unknown"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-body font-bold text-[#f97316]">{formatNum(Number(c.view_count))}</p>
                      <p className="text-[9px] font-body text-[#5c5c6e]">views</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Comments */}
      <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-white/85">Komentar Terbaru</h3>
          <Link to="/admin/comments" className="text-xs font-body text-[#f97316] hover:underline">
            Lihat Semua
          </Link>
        </div>

        {!recentComments.length ? (
          <p className="text-sm text-[#5c5c6e] font-body py-6 text-center">Belum ada komentar</p>
        ) : (
          <div className="space-y-2">
            {recentComments.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-[10px] font-bold font-body shrink-0 mt-0.5">
                  {c.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-body font-medium text-white/85">{c.username}</span>
                    {c.user_role === "admin" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#f97316]/15 text-[#f97316] text-[9px] font-body font-bold uppercase">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold uppercase ${
                      c.status === "approved" ? "bg-emerald-500/15 text-emerald-400"
                        : c.status === "pending" ? "bg-amber-500/15 text-amber-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#8e8ea0] font-body mt-0.5 truncate">{c.content}</p>
                  <p className="text-[10px] text-[#5c5c6e] font-body mt-1">{c.comic_slug} · {new Date(c.created_at).toLocaleDateString("id-ID")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
