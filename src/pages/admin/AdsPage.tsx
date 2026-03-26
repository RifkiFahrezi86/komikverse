import { useEffect, useState, useCallback } from "react";
import { Megaphone, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X, Code, Monitor, Smartphone } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");

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

const POS_COLORS: Record<string, string> = {
  home: "bg-blue-500/15 text-blue-400",
  detail: "bg-purple-500/15 text-purple-400",
  reader: "bg-emerald-500/15 text-emerald-400",
  browse: "bg-amber-500/15 text-amber-400",
  global: "bg-[#f97316]/15 text-[#f97316]",
};

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem("kv_token") || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newSlot, setNewSlot] = useState({ slot_name: "", label: "", position: "home" });
  const [saving, setSaving] = useState(false);

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/ads`, { headers: getHeaders() });
      const data = await res.json();
      if (data.ads) setAds(data.ads);
      setError("");
    } catch {
      setError("Gagal memuat data iklan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const toggleActive = async (ad: AdPlacement) => {
    try {
      await fetch(`${API_BASE}/admin/ads`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ id: ad.id, ad_code: ad.ad_code, is_active: !ad.is_active }),
      });
      setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, is_active: !a.is_active } : a)));
    } catch {
      setError("Gagal mengubah status iklan");
    }
  };

  const saveAdCode = async (ad: AdPlacement) => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/admin/ads`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ id: ad.id, ad_code: editCode, is_active: ad.is_active }),
      });
      setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, ad_code: editCode } : a)));
      setEditingId(null);
      setEditCode("");
    } catch {
      setError("Gagal menyimpan kode iklan");
    } finally {
      setSaving(false);
    }
  };

  const deleteAd = async (id: number) => {
    if (!confirm("Yakin hapus slot iklan ini?")) return;
    try {
      await fetch(`${API_BASE}/admin/ads`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ id }),
      });
      setAds((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Gagal menghapus iklan");
    }
  };

  const addSlot = async () => {
    if (!newSlot.slot_name || !newSlot.label) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/ads`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newSlot),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menambah slot");
        setSaving(false);
        return;
      }
      setShowAdd(false);
      setNewSlot({ slot_name: "", label: "", position: "home" });
      await fetchAds();
    } catch {
      setError("Gagal menambah slot iklan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2 mb-1">
            <Megaphone size={20} className="text-[#f97316]" /> Kelola Iklan
          </h2>
          <p className="text-xs text-[#5c5c6e] font-body">
            Kelola penempatan iklan di seluruh situs. Masukkan kode iklan (HTML/JS) ke setiap slot.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-semibold hover:bg-[#ea580c] transition-colors"
        >
          <Plus size={14} /> Tambah Slot
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-xs text-red-400 font-body">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Add new slot form */}
      {showAdd && (
        <div className="bg-[#12121a] rounded-xl border border-white/[0.06] p-4 mb-4">
          <h3 className="text-sm font-body font-semibold text-white/85 mb-3">Tambah Slot Baru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Slot name (contoh: home-top)"
              value={newSlot.slot_name}
              onChange={(e) => setNewSlot({ ...newSlot, slot_name: e.target.value.replace(/[^a-zA-Z0-9\-_]/g, "") })}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/85 text-xs font-body placeholder:text-[#5c5c6e] focus:outline-none focus:border-[#f97316]/50"
            />
            <input
              type="text"
              placeholder="Label (contoh: Banner Atas Homepage)"
              value={newSlot.label}
              onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/85 text-xs font-body placeholder:text-[#5c5c6e] focus:outline-none focus:border-[#f97316]/50"
            />
            <select
              value={newSlot.position}
              onChange={(e) => setNewSlot({ ...newSlot, position: e.target.value })}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/85 text-xs font-body focus:outline-none focus:border-[#f97316]/50"
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
              onClick={addSlot}
              disabled={saving || !newSlot.slot_name || !newSlot.label}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-semibold hover:bg-[#ea580c] transition-colors disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewSlot({ slot_name: "", label: "", position: "home" }); }}
              className="px-4 py-2 rounded-lg bg-white/[0.04] text-white/60 text-xs font-body hover:bg-white/[0.08] transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Ads list */}
      {ads.length === 0 ? (
        <div className="text-center py-12 text-[#5c5c6e] text-sm font-body">
          Belum ada slot iklan. Klik "Tambah Slot" untuk memulai.
        </div>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-[#12121a] rounded-xl border border-white/[0.04] overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {ad.position === "global" ? (
                    <Smartphone size={16} className="text-[#8e8ea0]" />
                  ) : (
                    <Monitor size={16} className="text-[#8e8ea0]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-body font-medium text-white/85">{ad.label}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-[#8e8ea0] font-mono">
                      {ad.slot_name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${POS_COLORS[ad.position] || "bg-white/5 text-[#8e8ea0]"}`}>
                      {ad.position}
                    </span>
                  </div>
                  <p className="text-[10px] font-body text-[#5c5c6e]">
                    {ad.ad_code ? `Kode iklan: ${ad.ad_code.length} karakter` : "Belum ada kode iklan"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle active */}
                  <button
                    onClick={() => toggleActive(ad)}
                    title={ad.is_active ? "Nonaktifkan" : "Aktifkan"}
                    className="transition-colors"
                  >
                    {ad.is_active ? (
                      <ToggleRight size={24} className="text-emerald-400" />
                    ) : (
                      <ToggleLeft size={24} className="text-[#5c5c6e]" />
                    )}
                  </button>

                  {/* Edit code */}
                  <button
                    onClick={() => {
                      if (editingId === ad.id) {
                        setEditingId(null);
                        setEditCode("");
                      } else {
                        setEditingId(ad.id);
                        setEditCode(ad.ad_code || "");
                      }
                    }}
                    title="Edit kode iklan"
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] transition-colors"
                  >
                    {editingId === ad.id ? <X size={14} /> : <Code size={14} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteAd(ad.id)}
                    title="Hapus slot"
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#8e8ea0] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Edit code panel */}
              {editingId === ad.id && (
                <div className="px-4 pb-4 border-t border-white/[0.04] pt-3">
                  <label className="block text-[10px] font-body text-[#8e8ea0] mb-1.5">
                    Kode Iklan (HTML/JavaScript)
                  </label>
                  <textarea
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/85 text-xs font-mono placeholder:text-[#5c5c6e] focus:outline-none focus:border-[#f97316]/50 resize-y"
                    placeholder="Paste kode iklan di sini..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveAdCode(ad)}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-body font-semibold hover:bg-[#ea580c] transition-colors disabled:opacity-50"
                    >
                      <Save size={12} /> {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditCode(""); }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/60 text-xs font-body hover:bg-white/[0.08] transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3 text-center">
          <div className="text-lg font-display font-bold text-white/85">{ads.length}</div>
          <div className="text-[10px] font-body text-[#5c5c6e]">Total Slot</div>
        </div>
        <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3 text-center">
          <div className="text-lg font-display font-bold text-emerald-400">{ads.filter((a) => a.is_active).length}</div>
          <div className="text-[10px] font-body text-[#5c5c6e]">Aktif</div>
        </div>
        <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3 text-center">
          <div className="text-lg font-display font-bold text-[#5c5c6e]">{ads.filter((a) => !a.is_active).length}</div>
          <div className="text-[10px] font-body text-[#5c5c6e]">Nonaktif</div>
        </div>
        <div className="bg-[#12121a] rounded-xl border border-white/[0.04] p-3 text-center">
          <div className="text-lg font-display font-bold text-amber-400">{ads.filter((a) => a.ad_code).length}</div>
          <div className="text-[10px] font-body text-[#5c5c6e]">Dengan Kode</div>
        </div>
      </div>
    </div>
  );
}
