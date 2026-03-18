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

const SLOT_LABELS: Record<string, { label: string; desc: string }> = {
  "home-top": { label: "Home - Top", desc: "Banner at the top of homepage" },
  "home-mid": { label: "Home - Middle", desc: "Between update and popular sections" },
  "detail-sidebar": { label: "Detail - Sidebar", desc: "Sidebar on comic detail page" },
  "detail-before-chapters": { label: "Detail - Before Chapters", desc: "Before the chapter list" },
  "reader-top": { label: "Reader - Top", desc: "Above chapter images" },
  "reader-bottom": { label: "Reader - Bottom", desc: "Below chapter images" },
  "reader-between": { label: "Reader - Between Images", desc: "Inserted between chapter images (every 10 images)" },
  "popup-global": { label: "Popup / Interstitial (Global)", desc: "Popup ad shown on all pages" },
  "popunder-global": { label: "Popunder (Global)", desc: "Popunder ad — opens new tab on first click (all pages)" },
  "socialbar-global": { label: "Social Bar (Global)", desc: "Sticky social bar shown on all pages (above body close)" },
  "native-home": { label: "Native Banner - Home", desc: "Native banner widget on homepage" },
  "native-detail": { label: "Native Banner - Detail", desc: "Native banner widget on comic detail page" },
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
        <Megaphone size={20} className="text-[#f97316]" /> Manage Ads
      </h2>
      <p className="text-xs text-[#5c5c6e] font-body mb-5">
        Paste ad code (Google Adsense, etc.) into the available slots. Ads can be enabled/disabled per position.
      </p>

      <div className="space-y-3">
        {ads.map((ad) => {
          const meta = SLOT_LABELS[ad.slot_name] || { label: ad.slot_name, desc: "" };
          return (
            <div key={ad.id} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-body font-medium text-white/85">{meta.label}</h3>
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
                placeholder="Paste ad code here... (HTML/script Adsense)"
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
