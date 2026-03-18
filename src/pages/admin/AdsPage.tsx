import { useEffect, useState } from "react";
import { Save, Loader2, Megaphone, ToggleLeft, ToggleRight, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface AdSlot {
  id: number;
  slot_name: string;
  ad_code: string;
  is_active: boolean;
}

// --- Ad code type detection ---
type DetectedAdType = "banner" | "native" | "popunder" | "socialbar" | "unknown";

function detectAdType(code: string): DetectedAdType {
  if (!code.trim()) return "unknown";
  const hasAtOptions = /atOptions\s*=/.test(code);
  const hasContainer = /id\s*=\s*["']container-/.test(code);
  const hasDataCfAsync = /data-cfasync/.test(code);
  // Single external script only (no atOptions, no container div)
  const scriptSrcs = code.match(/src\s*=\s*["']([^"']+)["']/gi) || [];
  const isSingleScript = scriptSrcs.length === 1 && !hasAtOptions && !hasContainer;

  if (hasAtOptions) return "banner";
  if (hasContainer && hasDataCfAsync) return "native";
  if (isSingleScript) {
    // Heuristic: popunder & social bar are both single external scripts
    // We mark as socialbar/popunder generically — both are "invisible" scripts
    return "socialbar"; // both popunder & social bar look the same in code
  }
  return "unknown";
}

const AD_TYPE_LABELS: Record<DetectedAdType, string> = {
  banner: "Banner (iframe)",
  native: "Native Banner",
  popunder: "Popunder / Social Bar",
  socialbar: "Popunder / Social Bar",
  unknown: "Tidak dikenali",
};

// Which detected types are acceptable for each slot adType
const ACCEPTABLE_TYPES: Record<string, DetectedAdType[]> = {
  "Banner 728×90": ["banner"],
  "Banner 300×250": ["banner"],
  "Banner / Native": ["banner", "native"],
  "Native Banner": ["native"],
  "Popunder": ["socialbar", "popunder"],
  "Social Bar": ["socialbar", "popunder"],
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
      return `⚠️ Kode ini terdeteksi sebagai "${detectedLabel}" — bukan ${slotAdType}! Social Bar/Popunder akan muncul sebagai notifikasi popup yang mengganggu di slot ini. Gunakan kode Banner (atOptions iframe) dari Adsterra.`;
    }
  }
  if (slotAdType === "Native Banner") {
    if (detected === "banner") {
      return `⚠️ Kode ini terdeteksi sebagai "Banner (iframe)" — bukan Native Banner. Gunakan kode Native Banner dari Adsterra (mengandung container div dan data-cfasync).`;
    }
    if (detected === "socialbar") {
      return `⚠️ Kode ini terdeteksi sebagai "${detectedLabel}" — bukan Native Banner. Social Bar/Popunder akan muncul sebagai notifikasi popup.`;
    }
  }

  return `⚠️ Kode terdeteksi sebagai "${detectedLabel}" — slot ini membutuhkan "${slotAdType}". Pastikan kode yang ditempel sesuai.`;
}

const SLOT_LABELS: Record<string, { label: string; desc: string; adType: string; hint: string }> = {
  "home-top": { label: "Home - Top", desc: "Banner di bagian atas homepage", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)" },
  "home-mid": { label: "Home - Middle", desc: "Di antara bagian update dan populer", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)" },
  "detail-sidebar": { label: "Detail - Sidebar", desc: "Sidebar di halaman detail komik", adType: "Banner 300×250", hint: "Gunakan kode: Banner 300×250 (atOptions iframe)" },
  "detail-before-chapters": { label: "Detail - Before Chapters", desc: "Sebelum daftar chapter", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)" },
  "reader-top": { label: "Reader - Top", desc: "Di atas gambar chapter", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)" },
  "reader-bottom": { label: "Reader - Bottom", desc: "Di bawah gambar chapter", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)" },
  "reader-between": { label: "Reader - Between Images", desc: "Disisipkan antar gambar chapter (setiap 10 gambar)", adType: "Banner 728×90", hint: "Gunakan kode: Banner 728×90 (atOptions iframe)" },
  "popup-global": { label: "Popup / Interstitial (Global)", desc: "Popup iklan visual. Gunakan kode Banner 728×90 atau Native Banner (BUKAN Popunder/Social Bar)", adType: "Banner / Native", hint: "Gunakan kode: Banner 728×90 atau Native Banner (yang tampil visual)" },
  "popunder-global": { label: "Popunder (Global)", desc: "Buka tab baru saat klik pertama. Tidak menampilkan gambar.", adType: "Popunder", hint: "Gunakan kode: Popunder (script tunggal tanpa atOptions)" },
  "socialbar-global": { label: "Social Bar (Global)", desc: "⛔ DINONAKTIFKAN — Social Bar membuat notifikasi push yang mengganggu pengunjung. Kode tetap tersimpan tapi tidak dimuat di website.", adType: "Social Bar", hint: "Social Bar dinonaktifkan dari kode frontend karena mengganggu pengunjung" },
  "native-home": { label: "Native Banner - Home", desc: "Widget native banner di homepage", adType: "Native Banner", hint: "Gunakan kode: Native Banner (dengan container div dan data-cfasync)" },
  "native-detail": { label: "Native Banner - Detail", desc: "Widget native banner di halaman detail komik", adType: "Native Banner", hint: "Gunakan kode: Native Banner (dengan container div dan data-cfasync)" },
};

export default function AdminAdsPage() {
  const { token } = useAuth();
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editCode, setEditCode] = useState<Record<number, string>>({});

  const loadAds = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/ads`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const list = d.ads || [];
        setAds(list);
        const codes: Record<number, string> = {};
        list.forEach((a: AdSlot) => { codes[a.id] = a.ad_code || ""; });
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="text-[#f97316] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2 mb-2">
        <Megaphone size={20} className="text-[#f97316]" /> Kelola Iklan
      </h2>
      <p className="text-xs text-[#5c5c6e] font-body mb-4">
        Tempel kode iklan (Adsterra, dll.) ke slot yang tersedia. Lihat label <span className="text-[#f97316] font-bold">tipe iklan</span> di setiap slot untuk mengetahui format yang sesuai.
      </p>

      {/* Guide Box */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2 mb-2">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <h3 className="text-sm font-body font-semibold text-blue-400">Panduan Tipe Kode Iklan Adsterra</h3>
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
          <div>
            <span className="text-white/70 font-semibold">Social Bar</span>
            <p className="text-[10px] mt-0.5">Script tunggal tanpa atOptions. Tampil sebagai notifikasi push. <strong className="text-red-400">Taruh HANYA di slot Social Bar (Global)!</strong></p>
          </div>
          <div>
            <span className="text-white/70 font-semibold">Popunder</span>
            <p className="text-[10px] mt-0.5">Script tunggal tanpa atOptions. Buka tab baru saat klik. <strong className="text-red-400">Taruh HANYA di slot Popunder (Global)!</strong></p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {ads.map((ad) => {
          const meta = SLOT_LABELS[ad.slot_name] || { label: ad.slot_name, desc: "", adType: "Unknown", hint: "" };
          const currentCode = editCode[ad.id] || "";
          const warning = getMismatchWarning(meta.adType, currentCode);
          return (
            <div key={ad.id} className={`bg-[#12121a] rounded-xl border p-4 ${warning ? "border-yellow-500/30" : "border-white/[0.04]"}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-body font-medium text-white/85">{meta.label}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f97316]/15 text-[#f97316]">{meta.adType}</span>
                  </div>
                  <p className="text-[10px] font-body text-[#5c5c6e]">{meta.desc}</p>
                </div>
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
              </div>

              <textarea
                value={currentCode}
                onChange={(e) => setEditCode((p) => ({ ...p, [ad.id]: e.target.value }))}
                placeholder={meta.hint || "Tempel kode iklan di sini... (HTML/script Adsterra)"}
                rows={4}
                className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border text-xs font-mono text-white placeholder-[#5c5c6e] focus:outline-none transition-colors resize-y ${warning ? "border-yellow-500/30 focus:border-yellow-500/50" : "border-white/[0.04] focus:border-[#f97316]/30"}`}
              />

              {warning && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-body text-yellow-300/90 leading-relaxed">{warning}</p>
                </div>
              )}

              <div className="flex justify-end mt-2">
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
