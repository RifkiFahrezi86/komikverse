import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import type { Comic } from "../lib/api";
import { searchComics } from "../lib/api";
import ComicCard from "../components/ComicCard";
import ComicCardSkeleton from "../components/ComicCardSkeleton";
import AdSlot from "../components/AdSlot";

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

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setActiveType("all");
    searchComics(q)
      .then((res) => setComics(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  const filtered = activeType === "all"
    ? comics
    : comics.filter((c) => c.type?.toLowerCase() === activeType);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top page-bottom md:pb-12">
      <h1 className="font-display text-xl sm:text-2xl text-white/85 flex items-center gap-2.5 mb-2 font-bold">
        <SearchIcon size={22} className="text-[#f97316]" />
        Hasil Pencarian
      </h1>
      {q && (
        <p className="text-[#8e8ea0] font-body text-sm mb-6">
          Menampilkan hasil untuk <span className="text-[#f97316] font-semibold">"{q}"</span>
          {!loading && comics.length > 0 && (
            <span className="ml-2 text-white/40">— {comics.length} komik ditemukan</span>
          )}
        </p>
      )}

      {/* Type Filter */}
      {q && comics.length > 0 && (
        <div className="flex items-center gap-1 mb-6 flex-wrap">
          {TYPES.map((t) => {
            const count = t.key === "all"
              ? comics.length
              : comics.filter((c) => c.type?.toLowerCase() === t.key).length;
            if (t.key !== "all" && count === 0) return null;
            return (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all flex items-center gap-1.5 ${
                  activeType === t.key
                    ? "bg-[#f97316] text-white"
                    : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {t.label}
                <span className={`text-[10px] px-1 py-0.5 rounded ${activeType === t.key ? "bg-white/20" : "bg-white/[0.06]"}`}>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <ComicCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#5c5c6e] font-body">
            Tidak ditemukan komik untuk "{q}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((c, i) => <ComicCard key={`${c._provider}-${c.href}-${i}`} comic={c} />)}
        </div>
      )}

      <AdSlot slot="browse-banner" className="mt-6 rounded-xl overflow-hidden" />
    </div>
  );
}
