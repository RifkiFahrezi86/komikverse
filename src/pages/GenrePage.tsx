import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { getGenres } from "../lib/api";
import type { Genre } from "../lib/api";
import AdSlot from "../components/AdSlot";

const FALLBACK_GENRES = [
  "Action", "Adventure", "Comedy", "Demon", "Drama", "Ecchi", "Fantasy",
  "Game", "Harem", "Historical", "Horror", "Isekai", "Magic", "Martial Arts",
  "Mature", "Mystery", "Psychological", "Romance", "School Life", "Seinen",
  "Shoujo", "Shounen", "Slice of Life", "Sports", "Supernatural",
];

export default function GenrePage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGenres()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setGenres(res.data);
        } else {
          setGenres(FALLBACK_GENRES.map((g) => ({ title: g, href: g.toLowerCase().replace(/\s+/g, "-") })));
        }
      })
      .catch(() => {
        setGenres(FALLBACK_GENRES.map((g) => ({ title: g, href: g.toLowerCase().replace(/\s+/g, "-") })));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top page-bottom md:pb-12">
      <h1 className="font-display text-xl sm:text-2xl text-white/85 flex items-center gap-2.5 mb-6 font-bold">
        <LayoutGrid size={22} className="text-[#f97316]" />
        Genre
      </h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {genres.map((genre) => {
            const slug = genre.href?.replace(/^\/(genre|genres)\//, "").replace(/^\//, "") || genre.title.toLowerCase().replace(/\s+/g, "-");
            return (
              <Link
                key={genre.title}
                to={`/genre/${slug}`}
                state={{ genreName: genre.title }}
                className="flex items-center justify-center px-3 py-3 rounded-lg bg-[#12121a] border border-white/[0.04] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all group"
              >
                <span className="text-sm font-body font-medium text-[#8e8ea0] group-hover:text-white transition-colors">
                  {genre.title}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <AdSlot slot="browse-banner" className="mt-6 rounded-xl overflow-hidden" />
    </div>
  );
}
