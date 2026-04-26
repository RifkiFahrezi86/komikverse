import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Loader2,
  Columns2,
  Rows3,
  SkipBack,
  SkipForward,
  Home,
  BookOpen,
} from "lucide-react";
import type { Chapter, ChapterData } from "../lib/api";
import { getChapterImages, getComicDetail } from "../lib/api";
import { recordRead } from "../lib/history";
import AdSlot from "../components/AdSlot";

const READER_DATA_SAVER_KEY = "kv_reader_data_saver";
const READER_NAV_HIDE_THRESHOLD = 40;
const READER_NAV_SHOW_THRESHOLD = 80;
const READER_NAV_MIN_DELTA = 6;
const MOBILE_READER_NAV_HIDE_THRESHOLD = 56;
const MOBILE_READER_NAV_SHOW_THRESHOLD = 160;
const MOBILE_READER_NAV_MIN_DELTA = 12;
const MOBILE_BREAKPOINT = 768;

function getReaderNavThresholds() {
  if (typeof window === "undefined") {
    return {
      hideThreshold: READER_NAV_HIDE_THRESHOLD,
      showThreshold: READER_NAV_SHOW_THRESHOLD,
      minDelta: READER_NAV_MIN_DELTA,
    };
  }

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  return isMobile
    ? {
        hideThreshold: MOBILE_READER_NAV_HIDE_THRESHOLD,
        showThreshold: MOBILE_READER_NAV_SHOW_THRESHOLD,
        minDelta: MOBILE_READER_NAV_MIN_DELTA,
      }
    : {
        hideThreshold: READER_NAV_HIDE_THRESHOLD,
        showThreshold: READER_NAV_SHOW_THRESHOLD,
        minDelta: READER_NAV_MIN_DELTA,
      };
}

function getInitialDataSaver(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(READER_DATA_SAVER_KEY);
    if (stored !== null) return stored === "1";
  } catch { /* ignore */ }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!connection?.saveData;
}

// Preload next N images for smoother scrolling
function useImagePreloader(panels: string[], chapterKey: string, currentIndex: number, ahead = 5) {
  useEffect(() => {
    if (panels.length === 0 || ahead <= 0) return;
    const start = Math.max(0, currentIndex);
    const end = Math.min(panels.length, start + ahead);
    const imgs: HTMLImageElement[] = [];
    for (let i = start; i < end; i++) {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = panels[i];
      imgs.push(img);
    }
    return () => { imgs.forEach(img => { img.src = ""; img.onload = null; }); };
  }, [panels, chapterKey, currentIndex, ahead]);
}

// Single image component with loading skeleton
const ReaderImage = React.memo(function ReaderImage({
  src,
  alt,
  eager,
}: {
  src: string;
  alt: string;
  eager: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errCount, setErrCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setErrCount(0);
  }, [src]);

  // Check if already cached
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalHeight > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className="relative w-full" style={{ minHeight: loaded ? undefined : '50vh' }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#12121a]">
          <Loader2 size={24} className="text-[#f97316]/60 animate-spin" />
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`w-full max-w-full h-auto block select-none transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        draggable={false}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          const img = e.currentTarget;
          if (errCount < 3) {
            const next = errCount + 1;
            setErrCount(next);
            const base = src.split("?")[0];
            if (next === 3) {
              img.src = `https://wsrv.nl/?url=${encodeURIComponent(base)}&default=1`;
            } else {
              img.src = `${base}?retry=${next}&t=${Date.now()}`;
            }
          } else {
            setLoaded(true); // show broken image rather than infinite spinner
          }
        }}
      />
    </div>
  );
});

function extractChapterSlug(href: string): string {
  return href.replace(/^\/(chapter)\//, "").replace(/^\//, "");
}

type ViewMode = "long-strip" | "single";

interface ReaderState {
  chapters?: Chapter[];
  comicSlug?: string;
  comicTitle?: string;
  comicImage?: string;
  comicType?: string;
  genres?: string[];
}

export default function ReaderPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routerState = location.state as ReaderState | null;

  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("long-strip");
  const [currentPage, setCurrentPage] = useState(0);
  const [navVisible, setNavVisible] = useState(true);
  const [dataSaver, setDataSaver] = useState(getInitialDataSaver);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<"up" | "down" | null>(null);
  const scrollTravel = useRef(0);
  const [fetchedChapters, setFetchedChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const stateChapters = routerState?.chapters || [];
  const chapters = stateChapters.length > 0 ? stateChapters : fetchedChapters;
  const comicSlug = routerState?.comicSlug || "";
  const comicTitle = routerState?.comicTitle || "";
  const comicImage = routerState?.comicImage || "";
  const comicType = routerState?.comicType;
  const genres = routerState?.genres;

  // Fetch chapter list from API if not available in state
  useEffect(() => {
    if (stateChapters.length > 0 || !comicSlug) return;
    setChaptersLoading(true);
    getComicDetail(comicSlug).then((res) => {
      if (res.data?.chapters) setFetchedChapters(res.data.chapters);
    }).catch(() => {}).finally(() => setChaptersLoading(false));
  }, [comicSlug, stateChapters.length]);

  const { prevChapter, nextChapter } = useMemo(() => {
    if (!slug || chapters.length === 0) return { prevChapter: null, nextChapter: null };
    const idx = chapters.findIndex((ch) => extractChapterSlug(ch.href) === slug);
    if (idx === -1) return { prevChapter: null, nextChapter: null };
    return {
      prevChapter: idx < chapters.length - 1 ? chapters[idx + 1] : null,
      nextChapter: idx > 0 ? chapters[idx - 1] : null,
    };
  }, [slug, chapters]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError("");
    setChapterData(null); // Clear old chapter data to prevent stale images
    // Find the chapter's tagged provider for more accurate fetching
    const currentCh = chapters.find((ch) => extractChapterSlug(ch.href) === slug);
    getChapterImages(slug, currentCh?.provider)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setChapterData(res.data[0]);
          // Record reading history
          if (comicSlug && comicTitle) {
            recordRead({
              comicSlug,
              comicTitle,
              comicImage,
              comicType,
              genres,
              chapterSlug: slug,
              chapterTitle: res.data[0].title || slug,
            });
          }
        } else {
          setError("Tidak ada gambar dalam chapter ini");
        }
      })
      .catch(() => setError("Gagal memuat chapter"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    setCurrentPage(0);
    window.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    if (viewMode !== "single" || !chapterData) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d") {
        setCurrentPage((p) => Math.min(p + 1, chapterData.panel.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        setCurrentPage((p) => Math.max(p - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewMode, chapterData]);

  useEffect(() => {
    if (viewMode !== "long-strip") return;
    const { hideThreshold, showThreshold, minDelta } = getReaderNavThresholds();
    lastScrollY.current = window.scrollY;
    scrollDirection.current = null;
    scrollTravel.current = 0;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      if (Math.abs(delta) < minDelta) {
        lastScrollY.current = y;
        return;
      }

      const nextDirection = delta > 0 ? "down" : "up";
      if (scrollDirection.current !== nextDirection) {
        scrollDirection.current = nextDirection;
        scrollTravel.current = 0;
      }

      scrollTravel.current += Math.abs(delta);

      if (nextDirection === "down" && navVisible && scrollTravel.current >= hideThreshold) {
        setNavVisible(false);
        scrollTravel.current = 0;
      } else if (nextDirection === "up" && !navVisible && scrollTravel.current >= showThreshold) {
        setNavVisible(true);
        scrollTravel.current = 0;
      }

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [navVisible, viewMode]);

  useEffect(() => {
    setNavVisible(true);
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(READER_DATA_SAVER_KEY, dataSaver ? "1" : "0");
    } catch { /* ignore */ }
  }, [dataSaver]);

  const toggleNav = useCallback(() => {
    setNavVisible((v) => !v);
  }, []);

  const goToChapter = (ch: Chapter) => {
    navigate(`/baca/${extractChapterSlug(ch.href)}`, {
      state: { chapters, comicSlug, comicTitle, comicImage, comicType, genres },
    });
  };

  const panels = chapterData?.panel || [];
  const eagerPanelCount = dataSaver ? 1 : 3;
  const preloadAhead = dataSaver ? 0 : viewMode === "single" ? 3 : 8;

  // Preload upcoming images (must be called before any early return)
  useImagePreloader(panels, slug || "", viewMode === "single" ? currentPage : 0, preloadAhead);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 size={32} className="text-[#f97316] animate-spin" />
      </div>
    );
  }

  if (error || !chapterData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-3">
        <p className="text-red-400/80 font-body text-sm">{error || "Chapter tidak ditemukan"}</p>
        <Link
          to="/"
          className="px-4 py-2 rounded-lg bg-[#f97316] text-white font-body font-medium text-sm hover:bg-[#ea580c] transition-colors"
        >
          Kembali ke Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative" style={{ touchAction: 'pan-y' }} onClick={toggleNav}>
      {/* Top controls */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.04] transition-transform duration-300 ${
          navVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-2.5">
          <Link
            to="/"
            className="p-2 rounded-lg text-[#8e8ea0] hover:text-[#f97316] hover:bg-white/[0.04] transition-colors flex-shrink-0"
            title="Home"
          >
            <Home size={18} />
          </Link>

          <h2 className="font-body text-sm font-medium text-white/85 truncate max-w-[180px] sm:max-w-md mx-2">
            {chapterData.title}
          </h2>

          <div className="flex items-center gap-2 flex-shrink-0">
            {comicSlug && (
              <Link
                to={`/komik/${comicSlug}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f97316]/10 border border-[#f97316]/25 text-[#f97316] hover:bg-[#f97316]/20 transition-colors"
                title="Detail Komik"
              >
                <BookOpen size={14} />
                <span className="text-[11px] font-body font-semibold">Detail</span>
              </Link>
            )}
            <button
              onClick={() => setDataSaver((current) => !current)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-body font-semibold transition-colors ${
                dataSaver
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-white/[0.04] border-white/[0.06] text-[#8e8ea0] hover:text-white"
              }`}
              title="Kurangi preload gambar untuk menghemat kuota"
            >
              Hemat Data
            </button>
            <button
              onClick={() => setViewMode(viewMode === "long-strip" ? "single" : "long-strip")}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] transition-colors"
              title={viewMode === "long-strip" ? "Mode Satu Halaman" : "Mode Long Strip"}
            >
              {viewMode === "long-strip" ? <Columns2 size={14} /> : <Rows3 size={14} />}
            </button>
          </div>
        </div>

        {viewMode === "single" && (
          <div className="text-center pb-1.5">
            <span className="text-[10px] font-body text-[#5c5c6e]">
              {currentPage + 1} / {panels.length}
            </span>
          </div>
        )}
        {dataSaver && (
          <div className="text-center pb-1.5">
            <span className="text-[10px] font-body text-emerald-300/80">
              Hemat data aktif: preload panel dimatikan
            </span>
          </div>
        )}
      </div>

      {/* Reader content */}
      <div className="pt-12 pb-16">
        {viewMode === "long-strip" ? (
          <div className="max-w-3xl mx-auto overflow-hidden">
            {/* Ad Slot - Reader Top */}
            <AdSlot slot="reader-top" className="mb-2" />
            {panels.map((src, i) => (
              <React.Fragment key={`${slug}-${i}`}>
                <ReaderImage
                  src={src}
                  alt={`Panel ${i + 1}`}
                  eager={i < eagerPanelCount}
                />
              </React.Fragment>
            ))}
            {/* Ad Slot - Reader Bottom */}
            <AdSlot slot="reader-bottom" className="mt-2" />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen px-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/[0.06] text-white/70 hover:bg-[#f97316]/30 disabled:opacity-10 transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <ReaderImage
              key={`${slug}-single-${currentPage}`}
              src={panels[currentPage]}
              alt={`Panel ${currentPage + 1}`}
              eager={true}
            />

            <button
              onClick={() => setCurrentPage((p) => Math.min(panels.length - 1, p + 1))}
              disabled={currentPage === panels.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/[0.06] text-white/70 hover:bg-[#f97316]/30 disabled:opacity-10 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom chapter nav */}
      <div
        className={`sticky bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
          navVisible ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.04]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => prevChapter && goToChapter(prevChapter)}
                disabled={!prevChapter || chaptersLoading}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-body font-medium text-sm transition-all ${
                  prevChapter
                    ? "bg-white/[0.04] border border-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] hover:border-[#f97316]/30"
                    : "bg-white/[0.02] text-[#3a3a4a] cursor-not-allowed"
                }`}
              >
                <SkipBack size={14} />
                <span className="hidden sm:inline">Prev</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <button
                onClick={() => nextChapter && goToChapter(nextChapter)}
                disabled={!nextChapter || chaptersLoading}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-body font-medium text-sm transition-all ${
                  nextChapter
                    ? "bg-[#f97316] text-white hover:bg-[#ea580c]"
                    : "bg-white/[0.02] text-[#3a3a4a] cursor-not-allowed"
                }`}
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll buttons */}
      {viewMode === "long-strip" && (
        <div className={`fixed right-4 bottom-28 z-[60] flex flex-col gap-2 transition-opacity duration-300 ${
          navVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="p-2.5 rounded-lg bg-[#16161f]/90 border border-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] hover:border-[#f97316]/30 transition-all"
            title="Scroll ke atas"
          >
            <ArrowUp size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
            }}
            className="p-2.5 rounded-lg bg-[#16161f]/90 border border-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] hover:border-[#f97316]/30 transition-all"
            title="Scroll ke bawah"
          >
            <ArrowDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
