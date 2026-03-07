import { useEffect, useState } from "react";
import { Users, Shield, Trash2, Loader2, KeyRound, Eye, EyeOff, X, Plus, Pencil, Check, Search } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface UserItem {
  id: number;
  username: string;
  email: string;
  role: string;
  is_seed?: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetShow, setResetShow] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPw, setCreatePw] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadUsers = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/users`, { headers })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []); // eslint-disable-line

  const deleteUser = async (id: number) => {
    if (!confirm("Hapus pengguna ini beserta semua komentarnya?")) return;
    setActionId(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/users?id=${id}`, { method: "DELETE", headers });
      loadUsers();
    } finally { setActionId(null); }
  };

  const saveEditName = async (id: number) => {
    if (!editName.trim()) return;
    setActionId(id);
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/users`, {
        method: "PATCH", headers,
        body: JSON.stringify({ id, username: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditId(null);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal update");
    } finally { setActionId(null); }
  };

  const resetPassword = async () => {
    if (!resetTarget || resetPw.length < 6) return;
    setResetLoading(true); setResetMsg(null);
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/users`, {
        method: "PUT", headers,
        body: JSON.stringify({ id: resetTarget.id, new_password: resetPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetMsg({ type: "ok", text: `Password ${resetTarget.username} berhasil direset!` });
      setResetPw("");
    } catch (err) {
      setResetMsg({ type: "err", text: err instanceof Error ? err.message : "Gagal" });
    } finally { setResetLoading(false); }
  };

  const createUser = async () => {
    if (!createName.trim() || !createEmail.trim() || createPw.length < 6) return;
    setCreateLoading(true);
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/users`, {
        method: "POST", headers,
        body: JSON.stringify({ username: createName, email: createEmail, password: createPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreate(false);
      setCreateName(""); setCreateEmail(""); setCreatePw("");
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuat user");
    } finally { setCreateLoading(false); }
  };

  const filtered = filter
    ? users.filter((u) => u.username.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()))
    : users;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2">
          <Users size={20} className="text-[#f97316]" /> Kelola Pengguna
          <span className="text-xs text-[#5c5c6e] font-body font-normal">({users.length})</span>
        </h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors">
          <Plus size={13} /> Tambah User
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5c6e]" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari username atau email..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors"
        />
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#16161f] rounded-xl border border-white/[0.08] shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-white/85 flex items-center gap-2"><Plus size={16} className="text-[#f97316]" /> Tambah User</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#5c5c6e] hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Username" className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors" autoFocus />
              <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="Email" type="email" className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors" />
              <input value={createPw} onChange={(e) => setCreatePw(e.target.value)} placeholder="Password (min 6 karakter)" type="password" className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg text-xs font-body text-[#8e8ea0] hover:text-white bg-white/[0.04] transition-colors">Batal</button>
                <button onClick={createUser} disabled={createLoading || !createName.trim() || !createEmail.trim() || createPw.length < 6} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] disabled:opacity-50 transition-colors">
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
      ) : (
        <div className="bg-[#12121a] rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] text-[#5c5c6e] uppercase tracking-wider font-medium px-4 py-3">User</th>
                  <th className="text-left text-[10px] text-[#5c5c6e] uppercase tracking-wider font-medium px-4 py-3">Email</th>
                  <th className="text-left text-[10px] text-[#5c5c6e] uppercase tracking-wider font-medium px-4 py-3">Role</th>
                  <th className="text-left text-[10px] text-[#5c5c6e] uppercase tracking-wider font-medium px-4 py-3">Dibuat</th>
                  <th className="text-right text-[10px] text-[#5c5c6e] uppercase tracking-wider font-medium px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-[10px] font-bold shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          {editId === u.id ? (
                            <div className="flex items-center gap-1">
                              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-xs font-body text-white focus:outline-none focus:border-[#f97316]/30 w-32" autoFocus onKeyDown={(e) => e.key === "Enter" && saveEditName(u.id)} />
                              <button onClick={() => saveEditName(u.id)} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"><Check size={13} /></button>
                              <button onClick={() => setEditId(null)} className="p-1 text-[#5c5c6e] hover:text-white rounded"><X size={13} /></button>
                            </div>
                          ) : (
                            <>
                              <span className="text-white/85 font-medium">{u.username}</span>
                              {isSelf && <span className="text-[9px] text-[#5c5c6e] bg-white/[0.04] px-1.5 py-0.5 rounded">Anda</span>}
                              {u.is_seed && <span className="text-[9px] text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded font-bold">SEED</span>}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#8e8ea0]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === "admin" ? "bg-[#f97316]/15 text-[#f97316]" : "bg-white/[0.04] text-[#8e8ea0]"
                        }`}>
                          {u.role === "admin" && <Shield size={10} />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5c5c6e] text-xs">
                        {new Date(u.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {actionId === u.id ? (
                          <Loader2 size={14} className="text-[#f97316] animate-spin inline" />
                        ) : isSelf ? (
                          <span className="text-[10px] text-[#5c5c6e] font-body">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditId(u.id); setEditName(u.username); }}
                              className="p-1.5 rounded text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="Edit Username"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => { setResetTarget(u); setResetPw(""); setResetMsg(null); setResetShow(false); }}
                              className="p-1.5 rounded text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound size={13} />
                            </button>
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => setResetTarget(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#16161f] rounded-xl border border-white/[0.08] shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-white/85 flex items-center gap-2">
                <KeyRound size={16} className="text-[#f97316]" /> Reset Password
              </h3>
              <button onClick={() => setResetTarget(null)} className="text-[#5c5c6e] hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-xs text-[#8e8ea0] font-body mb-3">
              Reset password untuk <span className="text-white/85 font-medium">{resetTarget.username}</span>
            </p>
            {resetMsg && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-body ${resetMsg.type === "ok" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                {resetMsg.text}
              </div>
            )}
            <div className="relative mb-3">
              <input
                type={resetShow ? "text" : "password"}
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="Password baru (min 6 karakter)"
                className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/40 transition-colors"
                autoFocus
              />
              <button type="button" onClick={() => setResetShow(!resetShow)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5c6e] hover:text-white">
                {resetShow ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetTarget(null)} className="px-3 py-2 rounded-lg text-xs font-body text-[#8e8ea0] hover:text-white bg-white/[0.04] transition-colors">Batal</button>
              <button onClick={resetPassword} disabled={resetLoading || resetPw.length < 6} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] disabled:opacity-50 transition-colors">
                {resetLoading ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />} Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
