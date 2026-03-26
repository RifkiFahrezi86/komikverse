import { Megaphone, Monitor, Smartphone, Layout, ExternalLink } from "lucide-react";

const AD_PLACEMENTS = [
  {
    label: "Banner Atas Homepage",
    size: "728×90",
    position: "Home",
    desc: "Banner leaderboard di bagian atas homepage, above the fold",
  },
  {
    label: "Native Banner Homepage",
    size: "Native Widget",
    position: "Home",
    desc: "Native ad yang menyatu dengan konten, di antara section Lanjutkan dan Rekomendasi",
  },
  {
    label: "Banner Tengah Homepage",
    size: "728×90",
    position: "Home",
    desc: "Banner di antara section Update Terbaru dan Populer",
  },
  {
    label: "Banner Bawah Homepage",
    size: "468×60",
    position: "Home",
    desc: "Banner di bawah section Populer",
  },
  {
    label: "Sidebar Detail Komik",
    size: "300×250",
    position: "Detail",
    desc: "Medium rectangle di sidebar halaman detail komik",
  },
  {
    label: "Banner Sebelum Daftar Chapter",
    size: "728×90",
    position: "Detail",
    desc: "Leaderboard sebelum daftar chapter di halaman detail",
  },
  {
    label: "Native Banner Detail",
    size: "Native Widget",
    position: "Detail",
    desc: "Native ad di halaman detail komik, menyatu dengan konten",
  },
  {
    label: "Reader Top",
    size: "728×90",
    position: "Reader",
    desc: "Banner di atas gambar chapter reader",
  },
  {
    label: "Reader Between Panels",
    size: "468×60",
    position: "Reader",
    desc: "Banner disisipkan setiap 10 panel gambar di long-strip mode",
  },
  {
    label: "Reader Bottom",
    size: "728×90",
    position: "Reader",
    desc: "Banner di bawah gambar chapter reader",
  },
  {
    label: "Genre & Search",
    size: "468×60",
    position: "Browse",
    desc: "Banner di bawah halaman Genre dan Pencarian",
  },
  {
    label: "Mobile Sticky Bottom",
    size: "320×50",
    position: "Global",
    desc: "Sticky banner di bawah layar khusus mobile, bisa ditutup",
    mobileOnly: true,
  },
  {
    label: "Popunder",
    size: "Script Only",
    position: "Global",
    desc: "Popunder 1x per sesi, delay 30 detik, tidak muncul saat membaca",
  },
];

const POS_COLORS: Record<string, string> = {
  Home: "bg-blue-500/15 text-blue-400",
  Detail: "bg-purple-500/15 text-purple-400",
  Reader: "bg-emerald-500/15 text-emerald-400",
  Browse: "bg-amber-500/15 text-amber-400",
  Global: "bg-[#f97316]/15 text-[#f97316]",
};

export default function AdminAdsPage() {
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2 mb-1">
        <Megaphone size={20} className="text-[#f97316]" /> Kelola Iklan
      </h2>
      <p className="text-xs text-[#5c5c6e] font-body mb-6">
        Semua iklan dikelola secara manual melalui kode. Berikut daftar penempatan iklan yang aktif.
      </p>

      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <Layout size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-body font-semibold text-blue-400 mb-1">Sistem Iklan Manual</h3>
            <p className="text-[11px] font-body text-[#8e8ea0] leading-relaxed">
              Iklan dikonfigurasi langsung di kode frontend (hardcoded) untuk kontrol penuh terhadap posisi, ukuran, dan perilaku.
              Untuk mengubah kode iklan, edit file <code className="text-[#f97316] bg-white/5 px-1 rounded">src/components/AdSlot.tsx</code> dan <code className="text-[#f97316] bg-white/5 px-1 rounded">src/components/MobileStickyAd.tsx</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {AD_PLACEMENTS.map((ad, i) => (
          <div key={i} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
              {ad.mobileOnly ? (
                <Smartphone size={16} className="text-[#8e8ea0]" />
              ) : (
                <Monitor size={16} className="text-[#8e8ea0]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-body font-medium text-white/85">{ad.label}</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f97316]/15 text-[#f97316]">{ad.size}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${POS_COLORS[ad.position] || "bg-white/5 text-[#8e8ea0]"}`}>
                  {ad.position}
                </span>
              </div>
              <p className="text-[10px] font-body text-[#5c5c6e]">{ad.desc}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-body font-medium text-emerald-400 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Active
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
