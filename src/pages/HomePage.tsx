import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft, TrendingUp, Sparkles, Clock } from "lucide-react";
import type { Comic } from "../lib/api";
import { getPopular, getLatest, getRecommended, getPopularMore, getLatestMore, getRecommendedMore } from "../lib/api";
import ComicCard, { UpdateCard, RecommendCard } from "../components/ComicCard";
import ComicCardSkeleton, { UpdateCardSkeleton, RecommendCardSkeleton } from "../components/ComicCardSkeleton";
import AdSlot from "../components/AdSlot";

const TYPE_TABS = [
  { key: "all", label: "Semua" },
  { key: "manhwa", label: "Manhwa" },
  { key: "manga", label: "Manga" },
  { key: "manhua", label: "Manhua" },
];

function filterByType(comics: Comic[], type: string): Comic[] {
  if (type === "all") return comics;
  return comics.filter((c) => c.type?.toLowerCase() === type);
}

function SectionHeader({
  title,
  icon,
  linkTo,
  linkLabel,
}: {
  title: string;
  icon: React.ReactNode;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-display text-lg sm:text-xl text-white/85 flex items-center gap-2.5 font-bold">
        {icon}
        {title}
      </h2>
      {linkTo && (
        <Link
          to={linkTo}
          className="text-xs font-body font-semibold text-[#f97316] hover:text-[#fb923c] flex items-center gap-0.5 transition-colors"
        >
          {linkLabel || "Lihat Semua"} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function HorizontalScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = () => {
    if (!ref.current) return;
    setCanLeft(ref.current.scrollLeft > 5);
    setCanRight(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth - 5);
  };

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  useEffect(() => {
    const el = ref.current;
    if (el) {
      checkScroll();
      el.addEventListener("scroll", checkScroll, { passive: true });
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [children]);

  return (
    <div className="relative group/scroll">
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#16161f]/90 border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white hover:bg-[#1e1e2a] transition-all shadow-lg opacity-0 group-hover/scroll:opacity-100"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      <div ref={ref} className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {children}
      </div>
      {canRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#16161f]/90 border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white hover:bg-[#1e1e2a] transition-all shadow-lg opacity-0 group-hover/scroll:opacity-100"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const [popular, setPopular] = useState<Comic[]>([]);
  const [latest, setLatest] = useState<Comic[]>([]);
  const [recommended, setRecommended] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [recTab, setRecTab] = useState("all");
  const [popTab, setPopTab] = useState("all");

  useEffect(() => {
    async function load() {
      // Phase 1: Fast load from primary provider (Shinigami)
      try {
        const [popRes, latRes, recRes] = await Promise.all([
          getPopular(),
          getLatest(),
          getRecommended(),
        ]);
        setPopular(popRes.data || []);
        setLatest(latRes.data || []);
        setRecommended(recRes.data || []);
      } catch (err) {
        console.error("Failed to load homepage:", err);
      } finally {
        setLoading(false);
      }

      // Phase 2: Enrich with other providers in background
      try {
        const [morePop, moreLat, moreRec] = await Promise.all([
          getPopularMore(),
          getLatestMore(),
          getRecommendedMore(),
        ]);
        const mergeUnique = (existing: Comic[], more: Comic[]): Comic[] => {
          const seen = new Set(existing.map(c => c.title.toLowerCase().replace(/[^a-z0-9]/g, "")));
          const novel = more.filter(c => {
            const key = c.title.toLowerCase().replace(/[^a-z0-9]/g, "");
            return !seen.has(key);
          });
          return novel.length > 0 ? [...existing, ...novel] : existing;
        };
        if (morePop.length > 0) setPopular(prev => mergeUnique(prev, morePop));
        if (moreLat.length > 0) setLatest(prev => mergeUnique(prev, moreLat));
        if (moreRec.length > 0) setRecommended(prev => mergeUnique(prev, moreRec));
      } catch {
        // Background enrichment failed — homepage still works with primary data
      }
    }
    load();
  }, []);

  const filteredRec = filterByType(recommended, recTab);
  const filteredPop = filterByType(popular, popTab);

  return (
    <div className="pt-16 pb-20 md:pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">

        {/* Ad Slot - Home Top */}
        <AdSlot name="home-top" className="mb-6 rounded-xl overflow-hidden" />

        {/* ─── Rekomendasi Section ─── */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="font-display text-lg sm:text-xl text-white/85 flex items-center gap-2.5 font-bold">
              <Sparkles size={20} className="text-[#f97316]" />
              Rekomendasi
            </h2>
            <div className="flex items-center gap-1">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRecTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-body font-medium rounded-lg transition-all ${
                    recTab === tab.key
                      ? "bg-[#f97316] text-white"
                      : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <HorizontalScroller>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <RecommendCardSkeleton key={i} />)
              : filteredRec.slice(0, 20).map((comic, i) => (
                  <RecommendCard key={`${comic.href}-${i}`} comic={comic} />
                ))}
            {!loading && filteredRec.length === 0 && (
              <p className="text-sm text-[#5c5c6e] font-body py-8">Tidak ada rekomendasi untuk tipe ini.</p>
            )}
          </HorizontalScroller>
        </section>

        {/* ─── Update Terbaru Section ─── */}
        <section className="mb-10">
          <SectionHeader
            title="Update Terbaru"
            icon={<Clock size={20} className="text-[#f97316]" />}
            linkTo="/terbaru"
            linkLabel="Lihat Semua"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => <UpdateCardSkeleton key={i} />)
              : latest.slice(0, 18).map((comic, i) => (
                  <UpdateCard key={`${comic.href}-${i}`} comic={comic} />
                ))}
          </div>

          {!loading && latest.length > 18 && (
            <div className="mt-5 text-center">
              <Link
                to="/terbaru"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm font-body font-medium text-[#8e8ea0] hover:text-white hover:border-white/[0.1] transition-all"
              >
                Lihat Semua Update <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </section>

        {/* ─── Populer Section ─── */}
        <AdSlot name="home-mid" className="mb-6 rounded-xl overflow-hidden" />
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="font-display text-lg sm:text-xl text-white/85 flex items-center gap-2.5 font-bold">
              <TrendingUp size={20} className="text-[#f97316]" />
              Populer
            </h2>
            <div className="flex items-center gap-1">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPopTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-body font-medium rounded-lg transition-all ${
                    popTab === tab.key
                      ? "bg-[#f97316] text-white"
                      : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <ComicCardSkeleton key={i} />)
              : filteredPop.slice(0, 18).map((comic, i) => (
                  <ComicCard key={`${comic.href}-${i}`} comic={comic} />
                ))}
          </div>
          {!loading && filteredPop.length === 0 && (
            <p className="text-sm text-[#5c5c6e] font-body py-8 text-center">Tidak ada komik populer untuk tipe ini.</p>
          )}
        </section>

        {/* Native Banner - Home (di bawah Populer) */}
        <AdSlot name="native-home" className="mb-6 rounded-xl overflow-hidden" />
      </div>
    </div>
  );
}
