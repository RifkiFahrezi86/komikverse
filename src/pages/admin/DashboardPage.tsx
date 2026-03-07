import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, Clock, Megaphone, Loader2, Database, ShieldCheck } from "lucide-react";
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
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ADMIN_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
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
