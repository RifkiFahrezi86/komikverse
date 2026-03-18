import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Loader2,
  Columns2,
  Rows3,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { Chapter, ChapterData } from "../lib/api";
import { getChapterImages } from "../lib/api";
import AdSlot from "../components/AdSlot";

// Preload next N images for smoother scrolling
function useImagePreloader(panels: string[], currentIndex: number, ahead = 5) {
  useEffect(() => {
    if (panels.length === 0) return;
    const start = Math.max(0, currentIndex);
    const end = Math.min(panels.length, start + ahead);
    const added: HTMLLinkElement[] = [];
    for (let i = start; i < end; i++) {
      const img = new Image();
      img.src = panels[i];
    }
    return () => { added.forEach(l => l.remove()); };
  }, [panels, currentIndex, ahead]);
}

function extractChapterSlug(href: string): string {
  return href.replace(/^\/(chapter)\//, "").replace(/^\//, "");
}

type ViewMode = "long-strip" | "single";

interface ReaderState {
  chapters?: Chapter[];
  comicSlug?: string;
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
  const lastScrollY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const chapters = routerState?.chapters || [];
  const comicSlug = routerState?.comicSlug || "";

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
    getChapterImages(slug)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setChapterData(res.data[0]);
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
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) > 30) {
        setNavVisible(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [viewMode]);

  useEffect(() => {
    setNavVisible(true);
    hideTimer.current = setTimeout(() => setNavVisible(false), 3000);
    return () => clearTimeout(hideTimer.current);
  }, [slug]);

  const toggleNav = useCallback(() => {
    setNavVisible((v) => {
      const next = !v;
      clearTimeout(hideTimer.current);
      if (next) {
        hideTimer.current = setTimeout(() => setNavVisible(false), 4000);
      }
      return next;
    });
  }, []);

  const goToChapter = (ch: Chapter) => {
    navigate(`/baca/${extractChapterSlug(ch.href)}`, {
      state: { chapters, comicSlug },
    });
  };

  const panels = chapterData?.panel || [];

  // Preload upcoming images (must be called before any early return)
  useImagePreloader(panels, viewMode === "single" ? currentPage : 0, viewMode === "single" ? 3 : 8);

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
    <div className="min-h-screen bg-black relative" onClick={toggleNav}>
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
            to={comicSlug ? `/komik/${comicSlug}` : "/"}
            className="text-sm font-body font-medium text-[#8e8ea0] hover:text-[#f97316] flex items-center gap-1 transition-colors"
          >
            <ChevronLeft size={16} /> {comicSlug ? "Detail" : "Home"}
          </Link>

          <h2 className="font-body text-sm font-medium text-white/85 truncate max-w-[180px] sm:max-w-md">
            {chapterData.title}
          </h2>

          <button
            onClick={() => setViewMode(viewMode === "long-strip" ? "single" : "long-strip")}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] transition-colors"
            title={viewMode === "long-strip" ? "Mode Satu Halaman" : "Mode Long Strip"}
          >
            {viewMode === "long-strip" ? <Columns2 size={14} /> : <Rows3 size={14} />}
          </button>
        </div>

        {viewMode === "single" && (
          <div className="text-center pb-1.5">
            <span className="text-[10px] font-body text-[#5c5c6e]">
              {currentPage + 1} / {panels.length}
            </span>
          </div>
        )}
      </div>

      {/* Reader content */}
      <div className="pt-12">
        {viewMode === "long-strip" ? (
          <div className="max-w-3xl mx-auto">
            {/* Ad Slot - Reader Top */}
            <AdSlot name="reader-top" className="mb-2" />
            {panels.map((src, i) => (
              <React.Fragment key={i}>
                <img
                  src={src}
                  alt={`Panel ${i + 1}`}
                  loading={i < 3 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full block"
                  referrerPolicy="no-referrer"
                />
                {/* Ad between images every 10 panels */}
                {(i + 1) % 10 === 0 && i < panels.length - 1 && (
                  <AdSlot name="reader-between" className="my-2" />
                )}
              </React.Fragment>
            ))}
            {/* Ad Slot - Reader Bottom */}
            <AdSlot name="reader-bottom" className="mt-2" />
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

            <img
              src={panels[currentPage]}
              alt={`Panel ${currentPage + 1}`}
              className="max-h-[90vh] max-w-full object-contain"
              referrerPolicy="no-referrer"
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
      {chapters.length > 0 && (
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
                  disabled={!prevChapter}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-body font-medium text-sm transition-all ${
                    prevChapter
                      ? "bg-white/[0.04] border border-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] hover:border-[#f97316]/30"
                      : "bg-white/[0.02] text-[#3a3a4a] cursor-not-allowed"
                  }`}
                >
                  <SkipBack size={14} />
                  <span className="hidden sm:inline">Prev Chapter</span>
                  <span className="sm:hidden">Prev</span>
                </button>

                <button
                  onClick={() => nextChapter && goToChapter(nextChapter)}
                  disabled={!nextChapter}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-body font-medium text-sm transition-all ${
                    nextChapter
                      ? "bg-[#f97316] text-white hover:bg-[#ea580c]"
                      : "bg-white/[0.02] text-[#3a3a4a] cursor-not-allowed"
                  }`}
                >
                  <span className="hidden sm:inline">Next Chapter</span>
                  <span className="sm:hidden">Next</span>
                  <SkipForward size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to top — show/hide with nav like prev/next */}
      {viewMode === "long-strip" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`fixed right-4 z-50 p-2.5 rounded-lg bg-[#16161f]/90 border border-white/[0.06] text-[#8e8ea0] hover:text-[#f97316] hover:border-[#f97316]/30 transition-all ${
            navVisible ? "bottom-24 opacity-100" : "bottom-4 opacity-0 pointer-events-none"
          }`}
          title="Scroll ke atas"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
