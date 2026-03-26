import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft, TrendingUp, Sparkles, Clock, Play, Trash2, Heart } from "lucide-react";
import type { Comic } from "../lib/api";
import { getPopular, getLatest, getRecommended, getPopularMore, getLatestMore, getRecommendedMore, getComicsByGenre } from "../lib/api";
import { getContinueReading, deleteComicFromHistory, getReadingStats } from "../lib/history";
import ComicCard, { UpdateCard, RecommendCard } from "../components/ComicCard";
import ComicCardSkeleton, { UpdateCardSkeleton, RecommendCardSkeleton } from "../components/ComicCardSkeleton";
import AdSlot from "../components/AdSlot";
import HomeScriptAds from "../components/HomeScriptAds";

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
  const [enrichFailed, setEnrichFailed] = useState(false);
  const [recTab, setRecTab] = useState("all");
  const [popTab, setPopTab] = useState("all");
  const [continueList, setContinueList] = useState(() => getContinueReading());
  const [genreRecs, setGenreRecs] = useState<{ genre: string; comics: Comic[] }[]>([]);

  // Fetch genre-based recommendations from user's reading history
  useEffect(() => {
    const stats = getReadingStats();
    const topGenres = stats.topGenres.slice(0, 3);
    if (topGenres.length === 0) return;
    const readSlugs = new Set(stats.recentComics.map(c => c.slug));
    Promise.all(
      topGenres.map(async (g) => {
        try {
          const slug = g.genre.toLowerCase().replace(/\s+/g, "-");
          const res = await getComicsByGenre(slug);
          const comics = (res.data || []).filter(c => {
            const s = c.href?.split("/").filter(Boolean).pop() || "";
            return !readSlugs.has(s);
          }).slice(0, 10);
          return { genre: g.genre, comics };
        } catch {
          return { genre: g.genre, comics: [] };
        }
      })
    ).then(results => setGenreRecs(results.filter(r => r.comics.length > 0)));
  }, []);

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
        // Background enrichment failed — show subtle indicator
        setEnrichFailed(true);
      }
    }
    load();
  }, []);

  const filteredRec = filterByType(recommended, recTab);
  const filteredPop = filterByType(popular, popTab);

  return (
    <div className="page-top page-bottom md:pb-12">
      {/* Script-only ads: Popunder + Social Bar */}
      <HomeScriptAds />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">

        {/* Banner 728x90 - Atas Homepage */}
        <AdSlot type="728x90" className="mb-6 rounded-xl overflow-hidden" />

        {enrichFailed && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-[11px] font-body text-yellow-400/80 text-center">
            Sebagian data dari provider lain gagal dimuat. Menampilkan data utama saja.
          </div>
        )}

        {/* ─── Lanjutkan Membaca Section ─── */}
        {continueList.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              title="Lanjutkan Membaca"
              icon={<Play size={20} className="text-[#f97316]" />}
            />
            <HorizontalScroller>
              {continueList.map((item) => (
                <div key={item.comicSlug} className="shrink-0 w-[140px] relative group">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteComicFromHistory(item.comicSlug); setContinueList(prev => prev.filter(c => c.comicSlug !== item.comicSlug)); }}
                    className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                  <Link
                    to={`/baca/${item.chapterSlug}`}
                    state={{ comicSlug: item.comicSlug, comicTitle: item.comicTitle, comicImage: item.comicImage, comicType: item.comicType, chapters: [] }}
                  >
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2 border border-white/[0.06] bg-[#12121a]">
                      {item.comicImage ? (
                        <img
                          src={item.comicImage}
                          alt={item.comicTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[10px] font-body font-medium text-white/90 truncate">
                          {item.chapterTitle}
                        </p>
                        {item.chaptersRead > 0 && (
                          <p className="text-[9px] font-body text-white/50 mt-0.5">
                            {item.chaptersRead} chapter dibaca
                          </p>
                        )}
                      </div>
                      <div className="absolute top-2 left-2">
                        <div className="w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center shadow-lg">
                          <Play size={10} className="text-white ml-0.5" />
                        </div>
                      </div>
                      {item.comicType && (
                        <div className="absolute top-2 right-2">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-body font-bold uppercase bg-black/60 text-white/80 backdrop-blur-sm">
                            {item.comicType}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-body font-medium text-[#c0c0d0] group-hover:text-[#f97316] transition-colors truncate">
                      {item.comicTitle}
                    </p>
                    <p className="text-[10px] font-body text-[#f97316] mt-0.5">Lanjutkan Baca →</p>
                  </Link>
                </div>
              ))}
            </HorizontalScroller>
          </section>
        )}

        {/* ─── Native Banner (menyatu dengan konten) ─── */}
        <AdSlot type="native" className="mb-10" />

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

        {/* ─── Genre Recommendations (from reading history) ─── */}
        {genreRecs.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              title="Untukmu"
              icon={<Heart size={20} className="text-pink-400" />}
            />
            <p className="text-xs font-body text-[#8e8ea0] -mt-4 mb-4">Berdasarkan genre favoritmu</p>
            {genreRecs.map((gr) => (
              <div key={gr.genre} className="mb-5">
                <Link
                  to={`/genre/${gr.genre.toLowerCase().replace(/\s+/g, "-")}`}
                  className="inline-flex items-center gap-1.5 text-sm font-body font-semibold text-[#c0c0d0] hover:text-[#f97316] transition-colors mb-3 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:border-[#f97316]/20"
                >
                  {gr.genre} <ChevronRight size={14} />
                </Link>
                <HorizontalScroller>
                  {gr.comics.map((comic, i) => (
                    <RecommendCard key={`${comic.href}-${i}`} comic={comic} />
                  ))}
                </HorizontalScroller>
              </div>
            ))}
          </section>
        )}

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
        <AdSlot type="728x90" className="mb-6 rounded-xl overflow-hidden" />
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

        <AdSlot type="468x60" className="mb-6 rounded-xl overflow-hidden" />
      </div>
    </div>
  );
}
