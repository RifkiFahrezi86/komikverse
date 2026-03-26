import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, Clock, Megaphone, Loader2, Database, ShieldCheck, TrendingUp, UserPlus, Eye } from "lucide-react";
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
  top_comics: { comic_slug: string; comic_title?: string; comic_type?: string; view_count: number; weekly_views?: number }[];
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

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthly, setMonthly] = useState<Monthly | null>(null);
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-[#f97316] animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Total Pengguna", value: stats?.total_users ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Komentar", value: stats?.total_comments ?? 0, icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Menunggu Review", value: stats?.pending_comments ?? 0, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Iklan Aktif", value: stats?.active_ads ?? 0, icon: Megaphone, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Seed Users", value: stats?.seed_users ?? 0, icon: Database, color: "text-pink-400", bg: "bg-pink-500/10" },
  ];

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

      {/* Monthly Stats */}
      {monthly && (
        <div className="mb-8">
          <h3 className="font-display text-sm font-bold text-white/85 flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-[#f97316]" /> Bulan Ini
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><UserPlus size={16} /></div>
                <div>
                  <p className="text-xl font-display font-bold text-white/85">{monthly.new_users}</p>
                  <p className="text-[9px] font-body text-[#5c5c6e] uppercase tracking-wider">User Baru</p>
                </div>
              </div>
            </div>
            <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><MessageSquare size={16} /></div>
                <div>
                  <p className="text-xl font-display font-bold text-white/85">{monthly.new_comments}</p>
                  <p className="text-[9px] font-body text-[#5c5c6e] uppercase tracking-wider">Komentar Baru</p>
                </div>
              </div>
            </div>
            <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400"><Eye size={16} /></div>
                <div>
                  <p className="text-xl font-display font-bold text-white/85">{monthly.total_views.toLocaleString("id-ID")}</p>
                  <p className="text-[9px] font-body text-[#5c5c6e] uppercase tracking-wider">Total Views</p>
                </div>
              </div>
            </div>
            <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400"><Database size={16} /></div>
                <div>
                  <p className="text-xl font-display font-bold text-white/85">{monthly.tracked_comics}</p>
                  <p className="text-[9px] font-body text-[#5c5c6e] uppercase tracking-wider">Komik Dilacak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Comics */}
          {monthly.top_comics && monthly.top_comics.length > 0 && (
            <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4 mb-4">
              <h4 className="text-xs font-display font-bold text-white/85 mb-3">Top 5 Komik (Views)</h4>
              <div className="space-y-2">
                {monthly.top_comics.map((c, i) => (
                  <div key={c.comic_slug} className="flex items-center gap-3 text-xs font-body">
                    <span className={`w-5 text-center font-bold ${i < 3 ? "text-amber-400" : "text-[#5c5c6e]"}`}>{i + 1}</span>
                    <span className="flex-1 text-white/85 truncate">{c.comic_title || c.comic_slug}</span>
                    {c.comic_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#f97316]/15 text-[#f97316]">{c.comic_type}</span>}
                    <span className="text-[#8e8ea0] shrink-0">{c.view_count.toLocaleString("id-ID")} views</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Activity (last 7 days) */}
          {monthly.daily_activity && monthly.daily_activity.length > 0 && (
            <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
              <h4 className="text-xs font-display font-bold text-white/85 mb-3">Aktivitas Harian (Bulan Ini)</h4>
              <div className="space-y-1.5">
                {monthly.daily_activity.slice(0, 7).map((d) => {
                  const maxReq = Math.max(...monthly.daily_activity.slice(0, 7).map(x => x.requests), 1);
                  const pct = Math.round((d.requests / maxReq) * 100);
                  return (
                    <div key={d.date} className="flex items-center gap-2 text-xs font-body">
                      <span className="w-20 text-[#5c5c6e] shrink-0">{new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      <div className="flex-1 h-4 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full bg-[#f97316]/40 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-[#8e8ea0] shrink-0">{d.requests} req</span>
                      <span className="w-14 text-right text-[#5c5c6e] shrink-0">{d.visitors} vis</span>
                    </div>
                  );
                })}
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
