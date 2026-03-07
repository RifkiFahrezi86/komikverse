import { useEffect, useState } from "react";
import { Check, X, Trash2, Loader2, Filter, MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { getPopular, getLatest } from "../../lib/api";
import { extractSlug } from "../../components/ComicCard";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface Comment {
  id: number;
  content: string;
  username: string;
  comic_slug: string;
  status: string;
  created_at: string;
}

export default function AdminCommentsPage() {
  const { token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionId, setActionId] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const loadComments = () => {
    setLoading(true);
    const url = filter === "all"
      ? `${ADMIN_BASE}/admin/comments`
      : `${ADMIN_BASE}/admin/comments?status=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadComments(); }, [filter]); // eslint-disable-line

  const updateStatus = async (id: number, status: string) => {
    setActionId(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      loadComments();
    } finally {
      setActionId(null);
    }
  };

  const deleteComment = async (id: number) => {
    if (!confirm("Hapus komentar ini?")) return;
    setActionId(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/comments?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadComments();
    } finally {
      setActionId(null);
    }
  };

  const FILTERS = [
    { key: "all", label: "Semua" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Disetujui" },
    { key: "hidden", label: "Disembunyikan" },
  ];

  const handleSeed = async () => {
    if (!confirm("Hapus semua komentar & user palsu lama, lalu buat ulang?\n20 user baru & 60 komentar di komik yang ada di website.")) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      // Step 1: Clean old fake data
      setSeedResult("⏳ Menghapus data palsu lama...");
      await fetch(`${ADMIN_BASE}/admin/seed`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Step 2: Fetch real comics from API providers
      setSeedResult("⏳ Mengambil daftar komik...");
      const [popular, latest] = await Promise.allSettled([getPopular(), getLatest()]);
      const allComics: { slug: string; title: string }[] = [];
      const seen = new Set<string>();
      for (const result of [popular, latest]) {
        if (result.status === "fulfilled" && result.value.data) {
          for (const c of result.value.data) {
            const slug = extractSlug(c.href);
            if (slug && !seen.has(slug)) {
              seen.add(slug);
              allComics.push({ slug, title: c.title });
            }
          }
        }
      }
      if (allComics.length === 0) {
        setSeedResult("❌ Gagal mengambil daftar komik dari API. Coba lagi nanti.");
        setSeeding(false);
        return;
      }
      // Send real comics to seed endpoint
      setSeedResult(`⏳ Seeding ke ${allComics.length} komik...`);
      const r = await fetch(`${ADMIN_BASE}/admin/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userCount: 20, commentCount: 60, comics: allComics.slice(0, 30) }),
      });
      const d = await r.json();
      if (d.success) {
        setSeedResult(`✅ ${d.users_created} user & ${d.comments_created} komentar dibuat di ${d.comics_used} komik!`);
        loadComments();
      } else {
        setSeedResult(`❌ ${d.error || "Gagal seed data"}`);
      }
    } catch {
      setSeedResult("❌ Gagal menghubungi server");
    } finally {
      setSeeding(false);
    }
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2">
          <MessageSquare size={20} className="text-[#f97316]" /> Kelola Komentar
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-all disabled:opacity-50"
          >
            {seeding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Seed Data
          </button>
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-[#5c5c6e] mr-1" />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 text-xs font-body font-medium rounded-lg transition-all ${
                  filter === f.key ? "bg-[#f97316] text-white" : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {seedResult && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white/80">
          {seedResult}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="text-[#f97316] animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#5c5c6e] font-body py-12 text-center">Tidak ada komentar</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-xs font-bold font-body shrink-0">
                  {c.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-body font-medium text-white/85">{c.username}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold uppercase ${
                      c.status === "approved" ? "bg-emerald-500/15 text-emerald-400"
                        : c.status === "pending" ? "bg-amber-500/15 text-amber-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>
                      {c.status}
                    </span>
                    <span className="text-[10px] text-[#5c5c6e] font-body">
                      {new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-[#8e8ea0] font-body mb-1">{c.content}</p>
                  <p className="text-[10px] text-[#5c5c6e] font-body">Komik: {c.comic_slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {actionId === c.id ? (
                    <Loader2 size={14} className="text-[#f97316] animate-spin" />
                  ) : (
                    <>
                      {c.status !== "approved" && (
                        <button onClick={() => updateStatus(c.id, "approved")} title="Setujui" className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                          <Check size={14} />
                        </button>
                      )}
                      {c.status !== "hidden" && (
                        <button onClick={() => updateStatus(c.id, "hidden")} title="Sembunyikan" className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <X size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteComment(c.id)} title="Hapus" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
