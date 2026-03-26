import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2, Save, Loader2, Power, PowerOff, Pencil, X } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { invalidateAdCache } from "../../components/AdSlot";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface AdPlacement {
  id: number;
  slot_name: string;
  label: string;
  ad_code: string;
  is_active: boolean;
  position: string;
  created_at: string;
  updated_at: string;
}

export default function AdminAdsPage() {
  const { token } = useAuth();
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newSlot, setNewSlot] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPosition, setNewPosition] = useState("home");
  const [createLoading, setCreateLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadAds = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/ads`, { headers })
      .then((r) => r.json())
      .then((d) => setAds(d.ads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAds(); }, []); // eslint-disable-line

  const toggleActive = async (ad: AdPlacement) => {
    setSaving(ad.id);
    try {
      await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "PUT", headers,
        body: JSON.stringify({ id: ad.id, ad_code: ad.ad_code, is_active: !ad.is_active }),
      });
      invalidateAdCache();
      loadAds();
    } finally { setSaving(null); }
  };

  const saveCode = async (ad: AdPlacement) => {
    setSaving(ad.id);
    try {
      await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "PUT", headers,
        body: JSON.stringify({ id: ad.id, ad_code: editCode, is_active: ad.is_active }),
      });
      invalidateAdCache();
      setEditId(null);
      loadAds();
    } finally { setSaving(null); }
  };

  const deleteAd = async (id: number) => {
    if (!confirm("Hapus slot iklan ini?")) return;
    setSaving(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "DELETE", headers,
        body: JSON.stringify({ id }),
      });
      invalidateAdCache();
      loadAds();
    } finally { setSaving(null); }
  };

  const createAd = async () => {
    if (!newSlot || !newLabel) return;
    setCreateLoading(true);
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "POST", headers,
        body: JSON.stringify({ slot_name: newSlot, label: newLabel, position: newPosition }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewSlot(""); setNewLabel(""); setNewPosition("home");
        loadAds();
      } else {
        const d = await res.json();
        alert(d.error || "Gagal");
      }
    } finally { setCreateLoading(false); }
  };

  const POS_COLORS: Record<string, string> = {
    home: "bg-blue-500/15 text-blue-400",
    detail: "bg-purple-500/15 text-purple-400",
    reader: "bg-emerald-500/15 text-emerald-400",
    browse: "bg-amber-500/15 text-amber-400",
    global: "bg-[#f97316]/15 text-[#f97316]",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2 mb-1">
            <Megaphone size={20} className="text-[#f97316]" /> Kelola Iklan
          </h2>
          <p className="text-xs text-[#5c5c6e] font-body">
            Kelola slot iklan dan kode iklan dari panel admin. Paste kode iklan (HTML/JS) ke field Ad Code.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors"
        >
          <Plus size={14} /> Tambah Slot
        </button>
      </div>

      {showCreate && (
        <div className="bg-[#12121a] rounded-xl border border-[#f97316]/20 p-4 mb-6">
          <h3 className="text-sm font-body font-semibold text-white/85 mb-3">Tambah Slot Iklan Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, ""))}
              placeholder="slot-name (contoh: home-banner)"
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/85 text-xs font-body placeholder:text-[#5c5c6e] focus:outline-none focus:border-[#f97316]/50"
            />
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (contoh: Banner Atas Homepage)"
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/85 text-xs font-body placeholder:text-[#5c5c6e] focus:outline-none focus:border-[#f97316]/50"
            />
            <select
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/85 text-xs font-body focus:outline-none focus:border-[#f97316]/50"
            >
              <option value="home">Home</option>
              <option value="detail">Detail</option>
              <option value="reader">Reader</option>
              <option value="browse">Browse</option>
              <option value="global">Global</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createAd}
              disabled={createLoading || !newSlot || !newLabel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors disabled:opacity-50"
            >
              {createLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Buat
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-body hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#f97316]" />
        </div>
      ) : ads.length === 0 ? (
        <p className="text-center text-[#5c5c6e] font-body text-sm py-12">Belum ada slot iklan.</p>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-body font-medium text-white/85">{ad.label}</h3>
                    <code className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-[#8e8ea0]">{ad.slot_name}</code>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${POS_COLORS[ad.position] || "bg-white/5 text-[#8e8ea0]"}`}>
                      {ad.position}
                    </span>
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${ad.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${ad.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                      {ad.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(ad)}
                    disabled={saving === ad.id}
                    className={`p-1.5 rounded-lg transition-colors ${ad.is_active ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-white/5 text-[#5c5c6e] hover:bg-white/10"}`}
                    title={ad.is_active ? "Nonaktifkan" : "Aktifkan"}
                  >
                    {saving === ad.id ? <Loader2 size={14} className="animate-spin" /> : ad.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                  </button>
                  <button
                    onClick={() => { setEditId(editId === ad.id ? null : ad.id); setEditCode(ad.ad_code); }}
                    className="p-1.5 rounded-lg bg-white/5 text-[#8e8ea0] hover:bg-white/10 hover:text-white/80 transition-colors"
                    title="Edit kode iklan"
                  >
                    {editId === ad.id ? <X size={14} /> : <Pencil size={14} />}
                  </button>
                  <button
                    onClick={() => deleteAd(ad.id)}
                    disabled={saving === ad.id}
                    className="p-1.5 rounded-lg bg-white/5 text-red-400/60 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                    title="Hapus slot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {editId === ad.id && (
                <div className="mt-3">
                  <label className="block text-[10px] font-body text-[#5c5c6e] mb-1.5">
                    Ad Code (paste kode HTML/JS iklan di sini)
                  </label>
                  <textarea
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white/85 text-xs font-mono placeholder:text-[#5c5c6e] focus:outline-none focus:border-[#f97316]/50 resize-y"
                    placeholder={'<script>\\nvar atOptions = { ... };\\n</script>\\n<script src="https://..."></script>'}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => saveCode(ad)}
                      disabled={saving === ad.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors disabled:opacity-50"
                    >
                      {saving === ad.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
                    </button>
                  </div>
                </div>
              )}

              {editId !== ad.id && ad.ad_code && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                  <pre className="text-[10px] font-mono text-[#5c5c6e] whitespace-pre-wrap break-all line-clamp-3">
                    {ad.ad_code}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
