import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { Comic } from "../lib/api";
import { setProvider } from "../lib/api";

export function extractSlug(href: string): string {
  return href.replace(/^\/(manga|series)\//, "").replace(/^\//, "");
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function useImageRetry(src: string) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const retryCount = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleImgError = useCallback(() => {
    if (retryCount.current < MAX_RETRIES) {
      retryCount.current += 1;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current && imgRef.current) {
          const base = src.split("?")[0];
          // Last retry: use wsrv.nl proxy as fallback
          if (retryCount.current === MAX_RETRIES) {
            imgRef.current.src = `https://wsrv.nl/?url=${encodeURIComponent(base)}&default=1`;
          } else {
            imgRef.current.src = `${base}?retry=${retryCount.current}&t=${Date.now()}`;
          }
        }
      }, RETRY_DELAY * retryCount.current);
    } else {
      setImgError(true);
    }
  }, [src]);

  return { imgRef, imgError, imgLoaded, setImgLoaded, handleImgError };
}

/** Default card — used in grids (Latest, Search, Bookmark, etc.) */
export default function ComicCard({ comic }: { comic: Comic }) {
  const slug = extractSlug(comic.href);
  const { imgRef, imgError, imgLoaded, setImgLoaded, handleImgError } = useImageRetry(comic.image);

  const handleClick = () => {
    if (comic._provider) setProvider(comic._provider);
  };

  return (
    <Link
      to={`/komik/${slug}`}
      onClick={handleClick}
      className="block rounded-lg overflow-hidden bg-[#12121a] border border-white/[0.04] group hover:border-white/[0.08] transition-all"
    >
      <div className="relative aspect-[3/4.2] overflow-hidden bg-[#1a1a24]">
        {!imgError ? (
          <img
            ref={imgRef}
            src={comic.image}
            alt={comic.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#3a3a4a]">
            <ImageOff size={28} />
            <span className="text-[10px] font-body">No Image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent" />

        {comic.type && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-body font-bold uppercase rounded bg-[#f97316]/90 text-white">
            {comic.type}
          </span>
        )}

        {comic.chapter && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-body font-semibold rounded bg-black/70 text-white/80">
            {comic.chapter}
          </span>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="text-[13px] font-body font-semibold text-white/70 line-clamp-2 leading-tight group-hover:text-[#f97316] transition-colors">
          {comic.title}
        </h3>
        {comic.genre && (
          <p className="text-[10px] font-body text-[#5c5c6e] mt-1 line-clamp-1">{comic.genre}</p>
        )}
      </div>
    </Link>
  );
}

/** Update card — horizontal layout with chapter links (shinigami-style) */
export function UpdateCard({ comic }: { comic: Comic }) {
  const slug = extractSlug(comic.href);
  const { imgRef, imgError, imgLoaded, setImgLoaded, handleImgError } = useImageRetry(comic.image);

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[#12121a] border border-white/[0.04] hover:border-white/[0.08] transition-all group">
      {/* Thumbnail */}
      <Link to={`/komik/${slug}`} className="shrink-0 w-[60px] h-[80px] rounded-md overflow-hidden bg-[#1a1a24]">
        {!imgError ? (
          <img
            ref={imgRef}
            src={comic.image}
            alt={comic.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover ${imgLoaded ? "opacity-100" : "opacity-0"} transition-opacity`}
            onLoad={() => setImgLoaded(true)}
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#3a3a4a]">
            <ImageOff size={18} />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/komik/${slug}`}>
          <h3 className="text-sm font-body font-semibold text-white/70 line-clamp-1 group-hover:text-[#f97316] transition-colors">
            {comic.title}
          </h3>
        </Link>
        {comic.type && (
          <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-body font-bold uppercase rounded bg-[#f97316]/20 text-[#f97316]">
            {comic.type}
          </span>
        )}
        {comic.chapter && (
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-1 text-[11px] font-body rounded bg-white/[0.04] text-[#8e8ea0] hover:bg-[#f97316]/10 hover:text-[#f97316] transition-colors">
              {comic.chapter}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Recommendation card — portrait with overlay (for carousel) */
export function RecommendCard({ comic }: { comic: Comic }) {
  const slug = extractSlug(comic.href);
  const { imgRef, imgError, imgLoaded, setImgLoaded, handleImgError } = useImageRetry(comic.image);

  return (
    <Link
      to={`/komik/${slug}`}
      className="block shrink-0 w-[140px] sm:w-[160px] rounded-lg overflow-hidden group"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1a1a24] rounded-lg">
        {!imgError ? (
          <img
            ref={imgRef}
            src={comic.image}
            alt={comic.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#3a3a4a]">
            <ImageOff size={24} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {comic.type && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-body font-bold uppercase rounded bg-[#f97316]/90 text-white">
            {comic.type}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h3 className="text-xs font-body font-semibold text-white/70 line-clamp-2 leading-tight">
            {comic.title}
          </h3>
          {comic.chapter && (
            <p className="text-[10px] font-body text-white/60 mt-1">{comic.chapter}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
