import { useEffect, useState } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface SettingItem {
  key: string;
  value: string;
}

const SETTING_META: Record<string, { label: string; desc: string; type: "text" | "toggle" }> = {
  site_name: { label: "Nama Situs", desc: "Nama yang tampil di header situs", type: "text" },
  ads_enabled: { label: "Aktifkan Iklan", desc: "Aktifkan/nonaktifkan semua iklan di situs", type: "toggle" },
  comment_moderation: { label: "Moderasi Komentar", desc: "Komentar baru harus disetujui admin sebelum tampil", type: "toggle" },
  maintenance_mode: { label: "Mode Maintenance", desc: "Nonaktifkan sementara akses publik ke situs", type: "toggle" },
  registration_enabled: { label: "Registrasi Terbuka", desc: "Izinkan pengguna baru mendaftar", type: "toggle" },
};

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const loadSettings = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        // API returns { settings: { key: value, ... } }
        const settingsObj: Record<string, string> = d.settings || {};
        const list: SettingItem[] = Object.entries(settingsObj).map(([key, value]) => ({ key, value }));
        setSettings(list);
        setEditValues(settingsObj);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []); // eslint-disable-line

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch(`${ADMIN_BASE}/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value }),
      });
      loadSettings();
    } finally {
      setSaving(null);
    }
  };

  const toggleSetting = async (key: string) => {
    const current = editValues[key];
    const newVal = current === "true" ? "false" : "true";
    setEditValues((p) => ({ ...p, [key]: newVal }));
    await saveSetting(key, newVal);
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
      <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2 mb-5">
        <Settings size={20} className="text-[#f97316]" /> Pengaturan
      </h2>

      <div className="space-y-3">
        {settings.map((s) => {
          const meta = SETTING_META[s.key] || { label: s.key, desc: "", type: "text" };
          return (
            <div key={s.key} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-body font-medium text-white/85">{meta.label}</h3>
                  <p className="text-[10px] font-body text-[#5c5c6e]">{meta.desc}</p>
                </div>
                {saving === s.key && <Loader2 size={14} className="text-[#f97316] animate-spin" />}
              </div>

              {meta.type === "toggle" ? (
                <button
                  onClick={() => toggleSetting(s.key)}
                  disabled={saving === s.key}
                  className="flex items-center gap-2 mt-1"
                >
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${
                    editValues[s.key] === "true" ? "bg-[#f97316]" : "bg-white/[0.08]"
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      editValues[s.key] === "true" ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </div>
                  <span className="text-xs font-body text-[#8e8ea0]">
                    {editValues[s.key] === "true" ? "Aktif" : "Nonaktif"}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValues[s.key] || ""}
                    onChange={(e) => setEditValues((p) => ({ ...p, [s.key]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors"
                  />
                  <button
                    onClick={() => saveSetting(s.key, editValues[s.key])}
                    disabled={saving === s.key}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors disabled:opacity-50"
                  >
                    <Save size={12} /> Simpan
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
