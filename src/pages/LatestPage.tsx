import { useEffect, useState } from "react";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { Comic } from "../lib/api";
import { getLatest } from "../lib/api";
import { UpdateCard } from "../components/ComicCard";
import { UpdateCardSkeleton } from "../components/ComicCardSkeleton";

export default function LatestPage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLatest(page)
      .then((res) => {
        setComics(res.data || []);
        setHasNext(!!res.has_next);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
  }, [page]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top page-bottom md:pb-12">
      <h1 className="font-display text-xl sm:text-2xl text-white/85 flex items-center gap-2.5 mb-6 font-bold">
        <Clock size={22} className="text-[#f97316]" />
        Update Terbaru
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 18 }).map((_, i) => <UpdateCardSkeleton key={i} />)
          : comics.map((c, i) => <UpdateCard key={`${c.href}-${i}`} comic={c} />)}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm font-body font-medium text-[#8e8ea0] hover:text-white hover:border-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="text-sm font-body font-semibold text-[#f97316]">
          Hal. {page}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext && comics.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm font-body font-medium text-[#8e8ea0] hover:text-white hover:border-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
