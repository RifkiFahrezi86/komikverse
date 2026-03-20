import { useEffect, useState } from "react";
import { Save, Loader2, Megaphone, ToggleLeft, ToggleRight, AlertTriangle, Info, Eye, EyeOff, Layout, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface AdSlot {
  id: number;
  slot_name: string;
  label: string;
  ad_code: string;
  is_active: boolean;
  position: string;
}

// --- Ad code type detection ---
type DetectedAdType = "banner" | "native" | "popunder" | "socialbar" | "unknown";

function detectAdType(code: string): DetectedAdType {
  if (!code.trim()) return "unknown";
  const hasAtOptions = /atOptions\s*=/.test(code);
  const hasContainer = /id\s*=\s*["']container-/.test(code);
  const hasDataCfAsync = /data-cfasync/.test(code);
  const scriptSrcs = code.match(/src\s*=\s*["']([^"']+)["']/gi) || [];
  const isSingleScript = scriptSrcs.length === 1 && !hasAtOptions && !hasContainer;

  if (hasAtOptions) return "banner";
  if (hasContainer && hasDataCfAsync) return "native";
  if (isSingleScript) return "socialbar";
  return "unknown";
}

const AD_TYPE_LABELS: Record<DetectedAdType, string> = {
  banner: "Banner (iframe)",
  native: "Native Banner",
  popunder: "Popunder / Social Bar",
  socialbar: "Popunder / Social Bar",
  unknown: "Tidak dikenali",
};

const ACCEPTABLE_TYPES: Record<string, DetectedAdType[]> = {
  "Banner 728×90": ["banner"],
  "Banner 300×250": ["banner"],
  "Banner / Native": ["banner", "native"],
  "Native Banner": ["native"],
};

function getMismatchWarning(slotAdType: string, code: string): string | null {
  if (!code.trim()) return null;
  const detected = detectAdType(code);
  if (detected === "unknown") return null;
  const acceptable = ACCEPTABLE_TYPES[slotAdType];
  if (!acceptable) return null;
  if (acceptable.includes(detected)) return null;

  const detectedLabel = AD_TYPE_LABELS[detected];

  if (slotAdType.startsWith("Banner") || slotAdType === "Banner / Native") {
    if (detected === "socialbar") {
      return `⚠️ Kode ini terdeteksi sebagai "${detectedLabel}" — bukan ${slotAdType}! Gunakan kode Banner (atOptions iframe) dari Adsterra.`;
    }
  }
  if (slotAdType === "Native Banner") {
    if (detected === "banner") {
      return `⚠️ Kode ini terdeteksi sebagai "Banner (iframe)" — bukan Native Banner. Gunakan kode Native Banner dari Adsterra (mengandung container div dan data-cfasync).`;
    }
    if (detected === "socialbar") {
      return `⚠️ Kode ini terdeteksi sebagai "${detectedLabel}" — bukan Native Banner.`;
    }
  }

  return `⚠️ Kode terdeteksi sebagai "${detectedLabel}" — slot ini membutuhkan "${slotAdType}". Pastikan kode yang ditempel sesuai.`;
}

// Known slot metadata (for built-in slots)
const SLOT_META: Record<string, { desc: string; adType: string; hint: string; size: string }> = {
  "home-top": { desc: "Banner di bagian atas homepage", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)", size: "728×90" },
  "home-mid": { desc: "Di antara bagian update dan populer", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)", size: "728×90" },
  "detail-sidebar": { desc: "Sidebar di halaman detail komik", adType: "Banner 300×250", hint: "Gunakan kode: Banner 300×250 (atOptions iframe)", size: "300×250" },
  "detail-before-chapters": { desc: "Sebelum daftar chapter", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)", size: "728×90" },
  "reader-top": { desc: "Di atas gambar chapter", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)", size: "728×90" },
  "reader-bottom": { desc: "Di bawah gambar chapter", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)", size: "728×90" },
  "reader-between": { desc: "Disisipkan antar gambar chapter (setiap 10 gambar)", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)", size: "728×90" },
  "popup-global": { desc: "Popup iklan visual (Banner/Native)", adType: "Banner / Native", hint: "Gunakan kode: Banner 728×90 atau Native Banner", size: "728×90" },
  "native-home": { desc: "Widget native banner di homepage", adType: "Native Banner", hint: "Gunakan kode: Native Banner (container div + data-cfasync)", size: "Widget" },
  "native-detail": { desc: "Widget native banner di detail komik", adType: "Native Banner", hint: "Gunakan kode: Native Banner (container div + data-cfasync)", size: "Widget" },
};

// Position options for new slots
const POSITION_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "detail", label: "Detail Komik" },
  { value: "reader", label: "Reader" },
  { value: "global", label: "Global (Semua Halaman)" },
];

// Size options for new slots
const SIZE_OPTIONS = [
  { value: "728x90", label: "728×90 (Leaderboard)" },
  { value: "300x250", label: "300×250 (Medium Rectangle)" },
  { value: "320x50", label: "320×50 (Mobile Banner)" },
  { value: "160x600", label: "160×600 (Wide Skyscraper)" },
  { value: "native", label: "Native Widget" },
  { value: "custom", label: "Custom" },
];

// Position label map
const POS_LABEL: Record<string, string> = { home: "Home", detail: "Detail", reader: "Reader", global: "Global" };

function getPositionFromSlot(slotName: string): string {
  if (slotName.startsWith("home")) return "home";
  if (slotName.startsWith("detail")) return "detail";
  if (slotName.startsWith("reader")) return "reader";
  if (slotName.includes("global")) return "global";
  return "home";
}

// --- Layout preview by position ---
function LayoutPreview({ position, slotName, size }: { position: string; slotName: string; size: string }) {
  const adBox = (
    <div className="border-2 border-dashed border-[#f97316]/50 rounded-lg flex items-center justify-center bg-[#f97316]/5" style={{ height: "35px" }}>
      <span className="text-[9px] font-mono text-[#f97316]">AD — {size}</span>
    </div>
  );

  if (position === "home" || slotName.startsWith("home")) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-24 bg-white/10 rounded" />
        {slotName.includes("top") && adBox}
        <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="w-12 h-16 bg-white/5 rounded flex-shrink-0" />)}</div>
        <div className="h-3 w-20 bg-white/10 rounded" />
        {(slotName.includes("mid") || slotName.includes("middle")) && adBox}
        {!slotName.includes("top") && !slotName.includes("mid") && !slotName.includes("middle") && adBox}
        <div className="grid grid-cols-3 gap-1">{[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 rounded" />)}</div>
      </div>
    );
  }

  if (position === "detail" || slotName.startsWith("detail")) {
    const isSidebar = slotName.includes("sidebar");
    return (
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2"><div className="w-16 h-20 bg-white/5 rounded" /><div className="flex-1 space-y-1"><div className="h-3 w-full bg-white/10 rounded" /><div className="h-2 w-3/4 bg-white/5 rounded" /></div></div>
          {!isSidebar && adBox}
          <div className="space-y-1">{[1,2,3].map(i => <div key={i} className="h-4 bg-white/5 rounded" />)}</div>
        </div>
        {isSidebar && (
          <div className="border-2 border-dashed border-[#f97316]/50 rounded-lg flex items-center justify-center bg-[#f97316]/5 flex-shrink-0" style={{ width: '80px', height: '70px' }}>
            <span className="text-[8px] font-mono text-[#f97316] text-center leading-tight">{size}</span>
          </div>
        )}
      </div>
    );
  }

  if (position === "reader" || slotName.startsWith("reader")) {
    return (
      <div className="space-y-1">
        <div className="h-3 w-16 bg-white/10 rounded mx-auto" />
        {slotName.includes("top") && adBox}
        <div className="space-y-0.5">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded" />)}</div>
        {slotName.includes("between") && adBox}
        {!slotName.includes("top") && !slotName.includes("between") && !slotName.includes("bottom") && adBox}
        <div className="space-y-0.5">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded" />)}</div>
        {slotName.includes("bottom") && adBox}
      </div>
    );
  }

  if (slotName === "popup-global" || slotName.includes("popup")) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100px' }}>
        <div className="border-2 border-dashed border-[#f97316]/50 rounded-lg flex items-center justify-center bg-[#f97316]/5 relative" style={{ width: '200px', height: '90px' }}>
          <span className="text-[9px] font-mono text-[#f97316]">POPUP AD — {size}</span>
          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white/20 flex items-center justify-center"><span className="text-[6px] text-white/60">✕</span></div>
        </div>
      </div>
    );
  }

  if (slotName.startsWith("native")) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-20 bg-white/10 rounded" />
        <div className="border-2 border-dashed border-[#f97316]/50 rounded-lg flex items-center justify-center bg-[#f97316]/5" style={{ height: '50px' }}>
          <span className="text-[9px] font-mono text-[#f97316]">NATIVE WIDGET — {size}</span>
        </div>
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 bg-white/10 rounded" />
      <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 rounded flex-1" />)}</div>
      {adBox}
      <div className="grid grid-cols-3 gap-1">{[1,2,3].map(i => <div key={i} className="h-8 bg-white/5 rounded" />)}</div>
    </div>
  );
}

export default function AdminAdsPage() {
  const { token } = useAuth();
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editCode, setEditCode] = useState<Record<number, string>>({});
  const [showPreview, setShowPreview] = useState<Record<number, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlotName, setNewSlotName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPosition, setNewPosition] = useState("home");
  const [newSize, setNewSize] = useState("728x90");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const loadAds = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/ads`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const list = (d.ads || []) as AdSlot[];
        setAds(list);
        const codes: Record<number, string> = {};
        list.forEach((a) => { codes[a.id] = a.ad_code || ""; });
        setEditCode(codes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAds(); }, []); // eslint-disable-line

  const saveAd = async (ad: AdSlot) => {
    setSaving(ad.id);
    try {
      await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: ad.id, ad_code: editCode[ad.id] || "", is_active: ad.is_active }),
      });
      loadAds();
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (ad: AdSlot) => {
    setSaving(ad.id);
    try {
      await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: ad.id, ad_code: editCode[ad.id] || ad.ad_code || "", is_active: !ad.is_active }),
      });
      loadAds();
    } finally {
      setSaving(null);
    }
  };

  const createSlot = async () => {
    const slug = newSlotName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "");
    if (!slug || !newLabel.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slot_name: slug, label: newLabel.trim(), position: newPosition, ad_size: newSize }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewSlotName("");
        setNewLabel("");
        setNewPosition("home");
        setNewSize("728x90");
        loadAds();
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteSlot = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/ads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      setConfirmDelete(null);
      loadAds();
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="text-[#f97316] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2">
          <Megaphone size={20} className="text-[#f97316]" /> Kelola Iklan
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? "Batal" : "Tambah Slot"}
        </button>
      </div>
      <p className="text-xs text-[#5c5c6e] font-body mb-4">
        Kelola slot iklan, tambah slot baru, atau hapus yang tidak dipakai.
      </p>

      {/* Add New Slot Form */}
      {showAddForm && (
        <div className="bg-[#12121a] rounded-xl border border-[#f97316]/20 p-4 mb-5">
          <h3 className="text-sm font-body font-semibold text-white/85 mb-3 flex items-center gap-2">
            <Plus size={14} className="text-[#f97316]" /> Tambah Slot Iklan Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-body text-[#8e8ea0] mb-1">Slot Name (ID unik, tanpa spasi)</label>
              <input
                type="text"
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                placeholder="contoh: home-bottom"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30"
              />
              {newSlotName && (
                <p className="text-[9px] font-mono text-[#5c5c6e] mt-1">
                  Slug: {newSlotName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-body text-[#8e8ea0] mb-1">Label (Nama tampilan)</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="contoh: Home - Bottom Banner"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-body text-[#8e8ea0] mb-1">Posisi Halaman</label>
              <select
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-body text-white focus:outline-none focus:border-[#f97316]/30"
              >
                {POSITION_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[#12121a]">{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-body text-[#8e8ea0] mb-1">Ukuran Iklan</label>
              <select
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-body text-white focus:outline-none focus:border-[#f97316]/30"
              >
                {SIZE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#12121a]">{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview of new slot position */}
          {newSlotName && (
            <div className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] font-body text-[#8e8ea0] mb-2 flex items-center gap-1.5">
                <Layout size={12} className="text-[#f97316]" />
                Simulasi Posisi — <span className="text-white/70">{POSITION_OPTIONS.find(p => p.value === newPosition)?.label}</span>
              </p>
              <div className="relative rounded-lg bg-[#0a0a0f] border border-white/[0.04] p-3 overflow-hidden" style={{ minHeight: '120px' }}>
                <LayoutPreview
                  position={newPosition}
                  slotName={newSlotName.trim().toLowerCase().replace(/\s+/g, "-")}
                  size={SIZE_OPTIONS.find(s => s.value === newSize)?.label.split(" ")[0] || newSize}
                />
              </div>
            </div>
          )}

          <button
            onClick={createSlot}
            disabled={creating || !newSlotName.trim() || !newLabel.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Buat Slot Baru
          </button>
        </div>
      )}

      {/* Guide Box */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2 mb-2">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <h3 className="text-sm font-body font-semibold text-blue-400">Panduan Tipe Kode Iklan</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-body text-[#8e8ea0] ml-6">
          <div>
            <span className="text-white/70 font-semibold">Banner 728×90 / 300×250</span>
            <p className="text-[10px] mt-0.5">Mengandung <code className="text-[#f97316] bg-white/5 px-1 rounded">atOptions</code> + <code className="text-[#f97316] bg-white/5 px-1 rounded">format: 'iframe'</code>. Tampil visual sebagai banner.</p>
          </div>
          <div>
            <span className="text-white/70 font-semibold">Native Banner</span>
            <p className="text-[10px] mt-0.5">Mengandung <code className="text-[#f97316] bg-white/5 px-1 rounded">data-cfasync</code> + <code className="text-[#f97316] bg-white/5 px-1 rounded">&lt;div id="container-..."&gt;</code>. Tampil sebagai widget.</p>
          </div>
        </div>
      </div>

      {/* Slot List */}
      <div className="space-y-3">
        {ads.length === 0 && (
          <div className="text-center py-8 text-[#5c5c6e] text-sm font-body">
            Belum ada slot iklan. Klik "Tambah Slot" untuk membuat yang baru.
          </div>
        )}
        {ads.map((ad) => {
          const knownMeta = SLOT_META[ad.slot_name];
          const adType = knownMeta?.adType || "Banner";
          const desc = knownMeta?.desc || ad.label || ad.slot_name;
          const hint = knownMeta?.hint || "Tempel kode iklan di sini... (HTML/script)";
          const size = knownMeta?.size || "Custom";
          const position = ad.position || getPositionFromSlot(ad.slot_name);
          const displayLabel = ad.label || knownMeta?.desc || ad.slot_name;
          const currentCode = editCode[ad.id] || "";
          const warning = getMismatchWarning(adType, currentCode);
          const isBuiltIn = !!knownMeta;

          return (
            <div key={ad.id} className={`bg-[#12121a] rounded-xl border p-4 ${warning ? "border-yellow-500/30" : "border-white/[0.04]"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-sm font-body font-medium text-white/85">{displayLabel}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f97316]/15 text-[#f97316]">{adType}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-[#8e8ea0]">{POS_LABEL[position] || position}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-[#5c5c6e]">{size}</span>
                  </div>
                  <p className="text-[10px] font-body text-[#5c5c6e]">{desc}</p>
                  <p className="text-[9px] font-mono text-[#3a3a4a] mt-0.5">{ad.slot_name}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(ad)}
                    disabled={saving === ad.id}
                    className="flex items-center gap-1.5 text-xs font-body font-medium transition-colors"
                  >
                    {ad.is_active ? (
                      <>
                        <ToggleRight size={20} className="text-emerald-400" />
                        <span className="text-emerald-400">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={20} className="text-[#5c5c6e]" />
                        <span className="text-[#5c5c6e]">Inactive</span>
                      </>
                    )}
                  </button>
                  {!isBuiltIn && (
                    confirmDelete === ad.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteSlot(ad.id)}
                          disabled={deleting === ad.id}
                          className="px-2 py-1 rounded text-[10px] font-body font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          {deleting === ad.id ? <Loader2 size={10} className="animate-spin" /> : "Hapus"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 rounded text-[10px] font-body font-medium bg-white/5 text-[#8e8ea0] hover:bg-white/10 transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(ad.id)}
                        className="p-1.5 rounded-lg text-[#5c5c6e] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Hapus slot"
                      >
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>

              <textarea
                value={currentCode}
                onChange={(e) => setEditCode((p) => ({ ...p, [ad.id]: e.target.value }))}
                placeholder={hint}
                rows={4}
                className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border text-xs font-mono text-white placeholder-[#5c5c6e] focus:outline-none transition-colors resize-y ${warning ? "border-yellow-500/30 focus:border-yellow-500/50" : "border-white/[0.04] focus:border-[#f97316]/30"}`}
              />

              {warning && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-body text-yellow-300/90 leading-relaxed">{warning}</p>
                </div>
              )}

              {/* Layout Preview */}
              {showPreview[ad.id] && (
                <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] font-body text-[#8e8ea0] mb-2 flex items-center gap-1.5">
                    <Layout size={12} className="text-[#f97316]" />
                    Preview Posisi — <span className="text-white/70">{POS_LABEL[position] || position}</span>
                  </p>
                  <div className="relative rounded-lg bg-[#0a0a0f] border border-white/[0.04] p-3 overflow-hidden" style={{ minHeight: '120px' }}>
                    <LayoutPreview position={position} slotName={ad.slot_name} size={size} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => setShowPreview((p) => ({ ...p, [ad.id]: !p[ad.id] }))}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] font-body font-medium text-[#8e8ea0] hover:text-[#f97316] hover:border-[#f97316]/20 transition-colors"
                >
                  {showPreview[ad.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                  {showPreview[ad.id] ? "Tutup Preview" : "Lihat Preview Posisi"}
                </button>
                <button
                  onClick={() => saveAd(ad)}
                  disabled={saving === ad.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors disabled:opacity-50"
                >
                  {saving === ad.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
