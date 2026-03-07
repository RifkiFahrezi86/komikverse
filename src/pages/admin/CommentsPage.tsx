import { useEffect, useState } from "react";
import { Trash2, Loader2, MessageSquare, Pencil, Plus, Database, X, Check, Search, CheckCircle2, EyeOff } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface Comment {
  id: number;
  content: string;
  comic_slug: string;
  comic_title?: string;
  user_id: number;
  username: string;
  user_role?: string;
  is_seed?: boolean;
  status: string;
  created_at: string;
}

interface UserOption {
  id: number;
  username: string;
}

export default function AdminCommentsPage() {
  const { token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createUserId, setCreateUserId] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadComments = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/comments`, { headers })
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadUsers = () => {
    fetch(`${ADMIN_BASE}/admin/users`, { headers })
      .then((r) => r.json())
      .then((d) => setUsers((d.users || []).map((u: any) => ({ id: u.id, username: u.username }))))
      .catch(() => {});
  };

  useEffect(() => { loadComments(); loadUsers(); }, []); // eslint-disable-line

  const deleteComment = async (id: number) => {
    if (!confirm("Hapus komentar ini?")) return;
    setActionId(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/comments?id=${id}`, { method: "DELETE", headers });
      loadComments();
    } finally { setActionId(null); }
  };

  const saveEdit = async (id: number) => {
    if (!editContent.trim()) return;
    setActionId(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/comments`, {
        method: "PATCH", headers,
        body: JSON.stringify({ id, content: editContent }),
      });
      setEditId(null);
      loadComments();
    } finally { setActionId(null); }
  };

  const updateStatus = async (id: number, status: string) => {
    setActionId(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/comments`, {
        method: "PATCH", headers,
        body: JSON.stringify({ id, status }),
      });
      loadComments();
    } finally { setActionId(null); }
  };

  const createComment = async () => {
    if (!createUserId || !createSlug.trim() || !createContent.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/comments`, {
        method: "POST", headers,
        body: JSON.stringify({ user_id: parseInt(createUserId), comic_slug: createSlug, comic_title: createTitle, content: createContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreate(false);
      setCreateUserId(""); setCreateSlug(""); setCreateTitle(""); setCreateContent("");
      loadComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuat komentar");
    } finally { setCreateLoading(false); }
  };

  const seedData = async () => {
    if (!confirm("Seed 100 fake users dan 120 fake comments? Data lama tidak terpengaruh.")) return;
    setSeedLoading(true); setSeedMsg("");
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/seed`, { method: "POST", headers, body: JSON.stringify({ user_count: 100, comment_count: 120 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSeedMsg(`Berhasil: ${data.created_users} users, ${data.created_comments} comments`);
      loadComments(); loadUsers();
    } catch (err) {
      setSeedMsg("Error: " + (err instanceof Error ? err.message : "Gagal seed"));
    } finally { setSeedLoading(false); }
  };

  const deleteSeed = async () => {
    if (!confirm("Hapus SEMUA data seed (fake users & comments)? Data asli tidak terpengaruh.")) return;
    setSeedLoading(true); setSeedMsg("");
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/seed`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSeedMsg(data.message || "Data seed berhasil dihapus");
      loadComments(); loadUsers();
    } catch (err) {
      setSeedMsg("Error: " + (err instanceof Error ? err.message : "Gagal hapus seed"));
    } finally { setSeedLoading(false); }
  };

  const filtered = comments.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (filter && !c.username.toLowerCase().includes(filter.toLowerCase()) && !c.comic_slug.toLowerCase().includes(filter.toLowerCase()) && !c.content.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2">
          <MessageSquare size={20} className="text-[#f97316]" /> Kelola Komentar
          <span className="text-xs text-[#5c5c6e] font-body font-normal">({comments.length})</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors">
            <Plus size={13} /> Tambah Komentar
          </button>
          <button onClick={seedData} disabled={seedLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-body font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {seedLoading ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />} Seed Data
          </button>
          <button onClick={deleteSeed} disabled={seedLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-body font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
            {seedLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Hapus Seed
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-body ${seedMsg.startsWith("Error") ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"}`}>
          {seedMsg}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-3">
        {(["all", "approved", "pending", "hidden"] as const).map((s) => {
          const count = s === "all" ? comments.length : comments.filter((c) => c.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-body transition-colors ${
                statusFilter === s ? "bg-[#f97316] text-white" : "bg-white/[0.04] text-[#8e8ea0] hover:text-white"
              }`}
            >
              {s === "all" ? "Semua" : s === "approved" ? "Disetujui" : s === "pending" ? "Menunggu" : "Tersembunyi"} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5c6e]" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari user, komik, atau isi komentar..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors"
        />
      </div>

      {/* Create Comment Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#16161f] rounded-xl border border-white/[0.08] shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-white/85 flex items-center gap-2">
                <Plus size={16} className="text-[#f97316]" /> Tambah Komentar
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-[#5c5c6e] hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-[#5c5c6e] font-body uppercase mb-1">User</label>
                <select value={createUserId} onChange={(e) => setCreateUserId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white focus:outline-none focus:border-[#f97316]/30 transition-colors">
                  <option value="">Pilih user...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#5c5c6e] font-body uppercase mb-1">Comic Slug</label>
                <input value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="contoh: solo-leveling" className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-[#5c5c6e] font-body uppercase mb-1">Judul Komik (opsional)</label>
                <input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="contoh: Solo Leveling" className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-[#5c5c6e] font-body uppercase mb-1">Komentar</label>
                <textarea value={createContent} onChange={(e) => setCreateContent(e.target.value)} rows={3} placeholder="Tulis komentar..." className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors resize-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg text-xs font-body text-[#8e8ea0] hover:text-white bg-white/[0.04] transition-colors">Batal</button>
                <button onClick={createComment} disabled={createLoading || !createUserId || !createSlug.trim() || !createContent.trim()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] disabled:opacity-50 transition-colors">
                  {createLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Tambah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="text-[#f97316] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#5c5c6e] font-body py-12 text-center">{filter ? "Tidak ditemukan" : "Tidak ada komentar"}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-xs font-bold font-body shrink-0">
                  {c.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-body font-medium text-white/85">{c.username}</span>
                    {c.user_role === "admin" && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-[#f97316]/15 text-[#f97316]">ADMIN</span>
                    )}
                    {c.is_seed && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-500/15 text-purple-400">SEED</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold uppercase ${
                      c.status === "approved" ? "bg-emerald-500/15 text-emerald-400"
                        : c.status === "pending" ? "bg-amber-500/15 text-amber-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>{c.status}</span>
                    <span className="text-[10px] text-[#5c5c6e] font-body">
                      {new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {editId === c.id ? (
                    <div className="flex items-start gap-2 mt-1">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-body text-white focus:outline-none focus:border-[#f97316]/30 transition-colors resize-none"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(c.id)} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10"><Check size={14} /></button>
                      <button onClick={() => setEditId(null)} className="p-1.5 rounded text-[#5c5c6e] hover:text-white"><X size={14} /></button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#8e8ea0] font-body mb-1">{c.content}</p>
                  )}

                  <p className="text-[10px] text-[#5c5c6e] font-body">Komik: {c.comic_title || c.comic_slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {actionId === c.id ? (
                    <Loader2 size={14} className="text-[#f97316] animate-spin" />
                  ) : editId !== c.id ? (
                    <>
                      {c.status !== "approved" && (
                        <button onClick={() => updateStatus(c.id, "approved")} title="Setujui" className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {c.status !== "hidden" && (
                        <button onClick={() => updateStatus(c.id, "hidden")} title="Sembunyikan" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10 transition-colors">
                          <EyeOff size={14} />
                        </button>
                      )}
                      <button onClick={() => { setEditId(c.id); setEditContent(c.content); }} title="Edit" className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteComment(c.id)} title="Hapus" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
