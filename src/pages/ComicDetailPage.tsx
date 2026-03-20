import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BookOpen,
  User,
  Calendar,
  Bookmark,
  BookmarkCheck,
  Loader2,
  ImageOff,
  ArrowUpDown,
  Search,
  ChevronRight,
  Star,
  Play,
  CheckCircle2,
  Eye,
} from "lucide-react";
import type { ComicDetail } from "../lib/api";
import { getComicDetail, getProvider, trackView, getViewCount, formatViews } from "../lib/api";
import { addBookmark, removeBookmark, isBookmarked } from "../lib/bookmark";
import { getLastReadForComic, getReadChapters } from "../lib/history";
import CommentSection from "../components/CommentSection";
import AdSlot from "../components/AdSlot";

function extractChapterSlug(href: string): string {
  return href.replace(/^\/(chapter)\//, "").replace(/^\//, "");
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export default function ComicDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [comic, setComic] = useState<ComicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const coverRetryCount = useRef(0);
  const coverImgRef = useRef<HTMLImageElement>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [lastRead, setLastRead] = useState<{ chapterSlug: string; chapterTitle: string } | null>(null);
  const [readChapterSlugs, setReadChapterSlugs] = useState<Set<string>>(new Set());
  const [viewCount, setViewCount] = useState(0);
  const currentProvider = getProvider();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getComicDetail(slug)
      .then((res) => {
        setComic(res.data);
        setSaved(isBookmarked(`/manga/${slug}`));
        // Load reading history for this comic
        const lr = getLastReadForComic(slug);
        if (lr) setLastRead({ chapterSlug: lr.chapterSlug, chapterTitle: lr.chapterTitle });
        setReadChapterSlugs(getReadChapters(slug));
        // Track view & fetch count (fire-and-forget)
        trackView(slug, res.data.title, res.data.image, res.data.type);
        getViewCount(slug).then(v => setViewCount(v.view_count));
      })
      .catch(() => setError("Gagal memuat detail komik"))
      .finally(() => setLoading(false));
  }, [slug]);

  const toggleBookmark = () => {
    if (!comic || !slug) return;
    const href = `/manga/${slug}`;
    if (saved) {
      removeBookmark(href);
      setSaved(false);
    } else {
      addBookmark({
        title: comic.title,
        image: comic.image,
        href,
        type: comic.type,
        rating: comic.rating,
      });
      setSaved(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="text-[#f97316] animate-spin" />
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-red-400/80 font-body text-sm">{error || "Komik tidak ditemukan"}</p>
        <Link
          to="/"
          className="px-4 py-2 rounded-lg bg-[#f97316] text-white font-body font-medium text-sm hover:bg-[#ea580c] transition-colors"
        >
          Kembali ke Home
        </Link>
      </div>
    );
  }

  const genres = Array.isArray(comic.genre)
    ? comic.genre.map((g) => (typeof g === "string" ? g : g.title))
    : [];

  const readerState = {
    chapters: comic.chapters,
    comicSlug: slug,
    comicTitle: comic.title,
    comicImage: comic.image,
    comicType: comic.type,
    genres,
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top pb-20 md:pb-12">
      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden mb-6">
        {/* Background blur */}
        <div className="absolute inset-0">
          {!imgError && comic.image && (
            <img src={comic.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover blur-3xl scale-125 opacity-15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-[#0a0a0f]/60" />
        </div>

        <div className="relative flex flex-col sm:flex-row gap-6 p-5 sm:p-7">
          {/* Cover */}
          <div className="shrink-0 mx-auto sm:mx-0">
            {!imgError && comic.image ? (
              <img
                ref={coverImgRef}
                src={comic.image}
                alt={comic.title}
                referrerPolicy="no-referrer"
                className="w-40 sm:w-48 rounded-lg shadow-xl border border-white/[0.06]"
                onError={() => {
                  if (coverRetryCount.current < MAX_RETRIES) {
                    coverRetryCount.current += 1;
                    setTimeout(() => {
                      if (coverImgRef.current && comic.image) {
                        const base = comic.image.split("?")[0];
                        coverImgRef.current.src = `${base}?retry=${coverRetryCount.current}&t=${Date.now()}`;
                      }
                    }, RETRY_DELAY * coverRetryCount.current);
                  } else {
                    setImgError(true);
                  }
                }}
              />
            ) : (
              <div className="w-40 sm:w-48 aspect-[3/4] rounded-lg border border-white/[0.06] bg-[#12121a] flex flex-col items-center justify-center gap-2 text-[#3a3a4a]">
                <ImageOff size={36} />
                <span className="text-[10px] font-body">No Image</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-grow min-w-0">
            <h1 className="font-display text-xl sm:text-2xl text-white/85 font-bold mb-3 leading-tight">
              {comic.title}
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {comic.type && (
                <span className="px-2 py-0.5 rounded text-[10px] font-body font-bold uppercase bg-[#f97316]/20 text-[#f97316]">
                  {comic.type}
                </span>
              )}
              {comic.status && (
                <span className="px-2 py-0.5 rounded text-[10px] font-body font-bold uppercase bg-emerald-500/15 text-emerald-400">
                  {comic.status}
                </span>
              )}
              {comic.rating && (
                <span className="px-2 py-0.5 rounded text-[10px] font-body font-bold bg-amber-500/15 text-amber-400 flex items-center gap-0.5">
                  <Star size={9} /> {comic.rating}
                </span>
              )}
              {viewCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-body font-bold bg-blue-500/15 text-blue-400 flex items-center gap-0.5">
                  <Eye size={9} /> {formatViews(viewCount)}
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="space-y-1 mb-3 text-xs text-[#8e8ea0] font-body">
              {comic.author && (
                <p className="flex items-center gap-1.5">
                  <User size={12} className="text-[#5c5c6e]" /> {comic.author}
                </p>
              )}
              {comic.released && (
                <p className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-[#5c5c6e]" /> {comic.released}
                </p>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {genres.map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded text-[10px] font-body font-medium bg-white/[0.04] text-[#8e8ea0] border border-white/[0.04]">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {comic.description && (
              <div className="mb-4">
                <p className={`text-xs text-[#8e8ea0] font-body leading-relaxed ${showFullDesc ? "" : "line-clamp-3"}`}>
                  {comic.description}
                </p>
                {comic.description.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-[11px] text-[#f97316] font-body font-medium mt-1 hover:underline"
                  >
                    {showFullDesc ? "Sembunyikan" : "Selengkapnya..."}
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {lastRead && (
                <Link
                  to={`/baca/${lastRead.chapterSlug}`}
                  state={readerState}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f97316] text-white font-body font-semibold text-sm hover:bg-[#ea580c] transition-colors"
                >
                  <Play size={14} /> Lanjutkan
                </Link>
              )}
              {comic.chapters.length > 0 && (
                <Link
                  to={`/baca/${extractChapterSlug(comic.chapters[0].href)}`}
                  state={readerState}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-body font-semibold text-sm transition-colors ${
                    lastRead
                      ? "bg-white/[0.06] border border-white/[0.08] text-[#c0c0d0] hover:text-white hover:bg-white/[0.1]"
                      : "bg-[#f97316] text-white hover:bg-[#ea580c]"
                  }`}
                >
                  <BookOpen size={14} /> {lastRead ? "Dari Awal" : "Baca Sekarang"}
                </Link>
              )}
              <button
                onClick={toggleBookmark}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-body font-medium text-sm border transition-all ${
                  saved
                    ? "bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]"
                    : "bg-white/[0.04] border-white/[0.06] text-[#8e8ea0] hover:border-[#f97316]/30 hover:text-[#f97316]"
                }`}
              >
                {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                {saved ? "Tersimpan" : "Bookmark"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ad Slot - Before Chapters */}
      <AdSlot name="detail-before-chapters" className="mb-4 rounded-xl overflow-hidden" />

      {/* Chapter Section */}
      <section>
        <div className="rounded-xl bg-[#12121a] border border-white/[0.04] p-4 mb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-display text-base text-white/85 font-bold flex items-center gap-2">
              <BookOpen size={16} className="text-[#f97316]" />
              Daftar Chapter
              <span className="text-[10px] text-[#5c5c6e] font-body font-normal ml-1">
                ({comic.chapters.length})
              </span>
            </h2>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                sortAsc
                  ? "bg-[#f97316]/10 text-[#f97316]"
                  : "text-[#8e8ea0] hover:text-white bg-white/[0.04]"
              }`}
            >
              <ArrowUpDown size={12} />
              {sortAsc ? "Terlama" : "Terbaru"}
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5c6e]" />
            <input
              type="text"
              placeholder="Cari chapter..."
              value={chapterSearch}
              onChange={(e) => setChapterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-all"
            />
          </div>
        </div>

        {/* Chapter List */}
        {(() => {
          let chapters = [...comic.chapters];
          if (sortAsc) chapters.reverse();
          if (chapterSearch.trim()) {
            const q = chapterSearch.trim().toLowerCase();
            chapters = chapters.filter((ch) => ch.title.toLowerCase().includes(q));
          }

          return (
            <div className="rounded-xl overflow-hidden max-h-[65vh] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
              <div className="space-y-1">
                {chapters.length === 0 ? (
                  <div className="rounded-lg p-8 text-center text-[#5c5c6e] font-body text-sm">
                    {chapterSearch.trim() ? `Tidak ada chapter "${chapterSearch}"` : "Belum ada chapter tersedia"}
                  </div>
                ) : (
                  chapters.map((ch, i) => {
                    const chSlug = extractChapterSlug(ch.href);
                    const isRead = readChapterSlugs.has(chSlug);
                    const isLastRead = lastRead?.chapterSlug === chSlug;
                    return (
                    <Link
                      key={ch.href + i}
                      to={`/baca/${chSlug}`}
                      state={readerState}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/[0.03] transition-all group ${
                        isLastRead ? "bg-[#f97316]/[0.06] border border-[#f97316]/20" : ""
                      }`}
                    >
                      {isRead && (
                        <CheckCircle2 size={14} className="text-emerald-500/70 shrink-0" />
                      )}
                      <div className="flex-grow min-w-0">
                        <p className={`text-sm font-body font-medium transition-colors truncate ${
                          isRead
                            ? "text-[#5c5c6e] group-hover:text-[#f97316]"
                            : "text-[#c0c0d0] group-hover:text-[#f97316]"
                        }`}>
                          {ch.title.match(/^chapter/i) ? ch.title : `Chapter ${ch.title}`}
                          {isLastRead && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f97316]/15 text-[#f97316]">
                              Terakhir
                            </span>
                          )}
                          {ch.provider && ch.provider !== currentProvider && (
                            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/[0.06] text-[#8b8ba0] border border-white/[0.06]">
                              {ch.provider === 'shinigami' ? '🔮' : ch.provider === 'komiku' ? '📚' : '⚔️'} {ch.provider}
                            </span>
                          )}
                        </p>
                      </div>
                      {ch.date && (
                        <span className="text-[10px] font-body text-[#5c5c6e] whitespace-nowrap shrink-0">
                          {new Date(ch.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-[#3a3a4a] group-hover:text-[#f97316] shrink-0 transition-colors" />
                    </Link>
                  );})
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Ad Slot - Sidebar */}
      <AdSlot name="detail-sidebar" className="mt-4 rounded-xl overflow-hidden" />

      {/* Native Banner - Detail */}
      <AdSlot name="native-detail" className="mt-4 rounded-xl overflow-hidden" />

      {/* Comment Section */}
      {slug && <CommentSection comicSlug={slug} />}
    </div>
  );
}
