import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import type { Comic } from "../lib/api";
import { searchAllProviders, PROVIDERS } from "../lib/api";
import ComicCard from "../components/ComicCard";
import ComicCardSkeleton from "../components/ComicCardSkeleton";

const TYPES = [
  { key: "all", label: "Semua" },
  { key: "manhwa", label: "Manhwa" },
  { key: "manga", label: "Manga" },
  { key: "manhua", label: "Manhua" },
];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState("all");
  const [activeProvider, setActiveProvider] = useState("all");

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setActiveType("all");
    setActiveProvider("all");
    searchAllProviders(q)
      .then((res) => setComics(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  const filtered = comics.filter((c) => {
    if (activeType !== "all" && c.type?.toLowerCase() !== activeType) return false;
    if (activeProvider !== "all" && c._provider !== activeProvider) return false;
    return true;
  });

  const providerCounts = PROVIDERS.map((p) => ({
    ...p,
    count: comics.filter((c) => c._provider === p.id).length,
  }));

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-20 pb-20 md:pb-12">
      <h1 className="font-display text-xl sm:text-2xl text-white/85 flex items-center gap-2.5 mb-2 font-bold">
        <SearchIcon size={22} className="text-[#f97316]" />
        Hasil Pencarian
      </h1>
      {q && (
        <p className="text-[#8e8ea0] font-body text-sm mb-4">
          Menampilkan hasil untuk <span className="text-[#f97316] font-semibold">"{q}"</span>
          {!loading && comics.length > 0 && (
            <span className="ml-2 text-white/40">— {comics.length} komik dari {providerCounts.filter(p => p.count > 0).length} provider</span>
          )}
        </p>
      )}

      {/* Provider Filter */}
      {q && comics.length > 0 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          <button
            onClick={() => setActiveProvider("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all flex items-center gap-1.5 ${
              activeProvider === "all"
                ? "bg-[#f97316] text-white"
                : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            Semua Provider
            <span className={`text-[10px] px-1 py-0.5 rounded ${activeProvider === "all" ? "bg-white/20" : "bg-white/[0.06]"}`}>
              {comics.length}
            </span>
          </button>
          {providerCounts.map((p) => {
            if (p.count === 0) return null;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all flex items-center gap-1.5 ${
                  activeProvider === p.id
                    ? "bg-[#f97316] text-white"
                    : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span>{p.icon}</span>
                {p.name}
                <span className={`text-[10px] px-1 py-0.5 rounded ${activeProvider === p.id ? "bg-white/20" : "bg-white/[0.06]"}`}>
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Type Filter */}
      {q && comics.length > 0 && (
        <div className="flex items-center gap-1 mb-6 flex-wrap">
          {TYPES.map((t) => {
            const base = activeProvider === "all" ? comics : comics.filter((c) => c._provider === activeProvider);
            const count = t.key === "all"
              ? base.length
              : base.filter((c) => c.type?.toLowerCase() === t.key).length;
            if (t.key !== "all" && count === 0) return null;
            return (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all flex items-center gap-1.5 ${
                  activeType === t.key
                    ? "bg-white/10 text-white"
                    : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {t.label}
                <span className={`text-[10px] px-1 py-0.5 rounded ${activeType === t.key ? "bg-white/10" : "bg-white/[0.06]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!q ? (
        <div className="text-center py-20">
          <SearchIcon size={48} className="text-[#2a2a3a] mx-auto mb-3" />
          <p className="text-[#5c5c6e] font-body">
            Ketik judul komik di search bar untuk mulai mencari
          </p>
        </div>
      ) : loading ? (
        <div className="text-center mb-4">
          <p className="text-[#8e8ea0] font-body text-sm">Mencari di semua provider...</p>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <ComicCardSkeleton key={i} />)}
        </div>
      ) : q && filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#5c5c6e] font-body">
            Tidak ditemukan komik untuk "{q}"
          </p>
        </div>
      ) : q ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((c, i) => <ComicCard key={`${c._provider}-${c.href}-${i}`} comic={c} />)}
        </div>
      ) : null}
    </div>
  );
}
