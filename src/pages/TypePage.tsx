import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { TrendingUp, Clock, Sparkles } from "lucide-react";
import type { Comic } from "../lib/api";
import { getPopular, getLatest, getRecommended } from "../lib/api";
import ComicCard from "../components/ComicCard";
import ComicCardSkeleton from "../components/ComicCardSkeleton";

const TYPE_INFO: Record<string, { label: string; description: string }> = {
  manga: { label: "Manga", description: "Komik dari Jepang dengan gaya baca kanan ke kiri" },
  manhwa: { label: "Manhwa", description: "Komik dari Korea dengan format long-strip vertikal" },
  manhua: { label: "Manhua", description: "Komik dari China dengan cerita dan seni yang khas" },
};

function filterByType(comics: Comic[], type: string): Comic[] {
  return comics.filter((c) => c.type?.toLowerCase() === type.toLowerCase());
}

export default function TypePage() {
  const { type } = useParams<{ type: string }>();
  const [popular, setPopular] = useState<Comic[]>([]);
  const [latest, setLatest] = useState<Comic[]>([]);
  const [recommended, setRecommended] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"popular" | "latest" | "recommended">("popular");

  const info = TYPE_INFO[type || ""] || { label: type || "", description: "" };

  useEffect(() => {
    setLoading(true);
    Promise.all([getPopular(), getLatest(), getRecommended()])
      .then(([popRes, latRes, recRes]) => {
        const t = type || "";
        setPopular(filterByType(popRes.data || [], t));
        setLatest(filterByType(latRes.data || [], t));
        setRecommended(filterByType(recRes.data || [], t));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type]);

  const tabs = [
    { key: "popular" as const, label: "Populer", icon: <TrendingUp size={14} />, data: popular },
    { key: "latest" as const, label: "Terbaru", icon: <Clock size={14} />, data: latest },
    { key: "recommended" as const, label: "Rekomendasi", icon: <Sparkles size={14} />, data: recommended },
  ];

  const activeData = tabs.find((t) => t.key === activeTab)?.data || [];
  const isEmpty = !loading && popular.length === 0 && latest.length === 0 && recommended.length === 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top page-bottom md:pb-12">
      {/* Type Switcher */}
      <div className="flex items-center gap-1 mb-6">
        {Object.entries(TYPE_INFO).map(([key, val]) => (
          <Link
            key={key}
            to={`/type/${key}`}
            className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
              type === key
                ? "bg-[#f97316] text-white"
                : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {val.label}
          </Link>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-xl sm:text-2xl text-white/85 font-bold mb-1">
          {info.label}
        </h1>
        {info.description && (
          <p className="text-sm text-[#5c5c6e] font-body">{info.description}</p>
        )}
      </div>

      {isEmpty ? (
        <div className="text-center py-20">
          <p className="text-[#5c5c6e] font-body">Tidak ada komik {info.label} ditemukan</p>
        </div>
      ) : (
        <>
          {/* Content Tabs */}
          <div className="flex items-center gap-1 mb-5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-[#f97316] text-white"
                    : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <ComicCardSkeleton key={i} />)
              : activeData.map((comic, i) => <ComicCard key={`${comic.href}-${i}`} comic={comic} />)}
          </div>

          {!loading && activeData.length === 0 && (
            <p className="text-center text-[#5c5c6e] font-body py-10">
              Tidak ada data untuk tab ini
            </p>
          )}
        </>
      )}
    </div>
  );
}
