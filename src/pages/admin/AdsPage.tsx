import { useEffect, useState } from "react";
import { Save, Loader2, Megaphone, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface AdSlot {
  id: number;
  slot_name: string;
  ad_code: string;
  is_active: boolean;
}

const SLOT_LABELS: Record<string, { label: string; desc: string; adType: string }> = {
  "home-top": { label: "Home - Top", desc: "Banner di bagian atas homepage", adType: "Banner 728×90" },
  "home-mid": { label: "Home - Middle", desc: "Di antara bagian update dan populer", adType: "Banner 728×90" },
  "detail-sidebar": { label: "Detail - Sidebar", desc: "Sidebar di halaman detail komik", adType: "Banner 300×250" },
  "detail-before-chapters": { label: "Detail - Before Chapters", desc: "Sebelum daftar chapter", adType: "Banner 728×90" },
  "reader-top": { label: "Reader - Top", desc: "Di atas gambar chapter", adType: "Banner 728×90" },
  "reader-bottom": { label: "Reader - Bottom", desc: "Di bawah gambar chapter", adType: "Banner 728×90" },
  "reader-between": { label: "Reader - Between Images", desc: "Disisipkan antar gambar chapter (setiap 10 gambar)", adType: "Banner 728×90" },
  "popup-global": { label: "Popup / Interstitial (Global)", desc: "Popup iklan visual. Gunakan kode Banner 728×90 atau Native Banner (BUKAN Popunder)", adType: "Banner / Native" },
  "popunder-global": { label: "Popunder (Global)", desc: "Buka tab baru saat klik pertama. Tidak menampilkan gambar.", adType: "Popunder" },
  "socialbar-global": { label: "Social Bar (Global)", desc: "Social bar sticky di semua halaman", adType: "Social Bar" },
  "native-home": { label: "Native Banner - Home", desc: "Widget native banner di homepage", adType: "Native Banner" },
  "native-detail": { label: "Native Banner - Detail", desc: "Widget native banner di halaman detail komik", adType: "Native Banner" },
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
      <p className="text-xs text-[#5c5c6e] font-body mb-5">
        Tempel kode iklan (Adsterra, dll.) ke slot yang tersedia. Lihat label <span className="text-[#f97316] font-bold">tipe iklan</span> di setiap slot untuk mengetahui format yang sesuai.
      </p>

      <div className="space-y-3">
        {ads.map((ad) => {
          const meta = SLOT_LABELS[ad.slot_name] || { label: ad.slot_name, desc: "", adType: "Unknown" };
          return (
            <div key={ad.id} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
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
                value={editCode[ad.id] || ""}
                onChange={(e) => setEditCode((p) => ({ ...p, [ad.id]: e.target.value }))}
                placeholder="Tempel kode iklan di sini... (HTML/script Adsterra)"
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs font-mono text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors resize-y"
              />

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
