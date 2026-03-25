import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import type { Comic } from "../lib/api";
import { getComicsByGenre, searchComics } from "../lib/api";
import ComicCard from "../components/ComicCard";
import ComicCardSkeleton from "../components/ComicCardSkeleton";

const TYPES = [
  { key: "all", label: "Semua" },
  { key: "manhwa", label: "Manhwa" },
  { key: "manga", label: "Manga" },
  { key: "manhua", label: "Manhua" },
];

export default function GenreDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const genreName =
    (location.state as { genreName?: string })?.genreName ||
    (slug || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getComicsByGenre(slug)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setComics(res.data);
        } else {
          return searchComics(genreName).then((r) => setComics(r.data || []));
        }
      })
      .catch(() => {
        searchComics(genreName)
          .then((r) => setComics(r.data || []))
          .catch(console.error);
      })
      .finally(() => {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
  }, [slug, genreName]);

  const filtered = activeType === "all"
    ? comics
    : comics.filter((c) => c.type?.toLowerCase() === activeType);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top page-bottom md:pb-12">
      <h1 className="font-display text-xl sm:text-2xl text-white/85 mb-5 font-bold flex items-center gap-2.5">
        <LayoutGrid size={22} className="text-[#f97316]" />
        Genre: <span className="text-[#f97316]">{genreName}</span>
      </h1>

      {/* Type Filter */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {TYPES.map((t) => {
          const count = t.key === "all"
            ? comics.length
            : comics.filter((c) => c.type?.toLowerCase() === t.key).length;
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
                {loading ? "..." : count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {loading
          ? Array.from({ length: 18 }).map((_, i) => <ComicCardSkeleton key={i} />)
          : filtered.map((c, i) => <ComicCard key={`${c.href}-${i}`} comic={c} />)}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-[#5c5c6e] font-body">
            Tidak ada komik untuk genre {genreName}
          </p>
        </div>
      )}
    </div>
  );
}
