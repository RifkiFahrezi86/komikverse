import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Eye, Flame, Crown, Star, Gift, ImageOff } from "lucide-react";
import { getViewLeaderboard, getStreakLeaderboard, formatViews } from "../lib/api";

const TYPE_TABS = [
  { key: "all", label: "Semua" },
  { key: "manhwa", label: "Manhwa" },
  { key: "manga", label: "Manga" },
  { key: "manhua", label: "Manhua" },
];

interface ComicRank {
  rank: number;
  comic_slug: string;
  comic_title: string;
  comic_image: string;
  comic_type?: string;
  view_count: number;
  weekly_views: number;
}

interface StreakUser {
  rank: number;
  username: string;
  avatar_url?: string;
  current_streak: number;
  longest_streak: number;
}

function PodiumCard({ comic, position }: { comic: ComicRank; position: 1 | 2 | 3 }) {
  const sizes = {
    1: { img: "w-24 h-24 sm:w-28 sm:h-28", ring: "ring-[#f97316]", badge: "bg-[#f97316]", mt: "mt-0" },
    2: { img: "w-18 h-18 sm:w-22 sm:h-22", ring: "ring-[#94a3b8]", badge: "bg-[#94a3b8]", mt: "mt-6" },
    3: { img: "w-18 h-18 sm:w-22 sm:h-22", ring: "ring-[#cd7f32]", badge: "bg-[#cd7f32]", mt: "mt-6" },
  };
  const s = sizes[position];
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <Link to={`/komik/${comic.comic_slug}`} className={`flex flex-col items-center ${s.mt} group`}>
      <div className={`relative ${s.img} rounded-full overflow-hidden ring-2 ${s.ring} bg-[#1a1a24]`}>
        {comic.comic_image ? (
          <img
            src={comic.comic_image}
            alt={comic.comic_title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#3a3a4a]">
            <ImageOff size={20} />
          </div>
        )}
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full ${s.badge} flex items-center justify-center text-white text-[10px] font-bold shadow-lg`}>
          {position}
        </div>
      </div>
      {position === 1 && <Flame size={16} className="text-[#f97316] mt-1 animate-pulse" />}
      <p className="text-xs font-body font-medium text-[#c0c0d0] group-hover:text-[#f97316] transition-colors text-center mt-1 max-w-[100px] truncate">
        {comic.comic_title}
      </p>
      {comic.comic_type && (
        <span className="text-[8px] font-body font-bold uppercase text-[#f97316]/70">{comic.comic_type}</span>
      )}
      <span className="flex items-center gap-0.5 text-[10px] font-body text-[#8e8ea0] mt-0.5">
        <Star size={8} className="text-amber-400" /> {formatViews(comic.weekly_views)}
      </span>
    </Link>
  );
}

export default function RankingPage() {
  const [comicTab, setComicTab] = useState("all");
  const [comics, setComics] = useState<ComicRank[]>([]);
  const [streakUsers, setStreakUsers] = useState<StreakUser[]>([]);
  const [loadingComics, setLoadingComics] = useState(true);
  const [loadingStreaks, setLoadingStreaks] = useState(true);

  useEffect(() => {
    setLoadingComics(true);
    getViewLeaderboard(comicTab, 20).then((data) => {
      setComics(data);
      setLoadingComics(false);
    });
  }, [comicTab]);

  useEffect(() => {
    getStreakLeaderboard(20).then((data) => {
      setStreakUsers(data);
      setLoadingStreaks(false);
    });
  }, []);

  const top3 = comics.slice(0, 3);
  const rest = comics.slice(3);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top pb-20 md:pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-xl sm:text-2xl text-white/85 font-bold flex items-center gap-2.5">
          <Trophy size={24} className="text-[#f97316]" />
          Papan Peringkat
        </h1>
        <p className="text-xs font-body text-[#8e8ea0] mt-1">Komik terpopuler minggu ini</p>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto hide-scrollbar">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setComicTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-body font-medium rounded-lg transition-all whitespace-nowrap ${
              comicTab === tab.key
                ? "bg-[#f97316] text-white"
                : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {!loadingComics && top3.length >= 3 && (
        <div className="flex justify-center items-end gap-4 sm:gap-8 mb-8">
          <PodiumCard comic={top3[1]} position={2} />
          <PodiumCard comic={top3[0]} position={1} />
          <PodiumCard comic={top3[2]} position={3} />
        </div>
      )}

      {loadingComics && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Full Rankings */}
      {rest.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-base text-white/85 font-bold flex items-center gap-2 mb-4">
            <span className="text-lg">📈</span>
            Peringkat Lengkap
          </h2>
          <div className="space-y-2">
            {rest.map((comic) => (
              <Link
                key={comic.comic_slug}
                to={`/komik/${comic.comic_slug}`}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                  comic.rank <= 3
                    ? "bg-gradient-to-r from-[#f97316]/10 to-[#12121a] border-[#f97316]/20"
                    : "bg-[#12121a] border-white/[0.04] hover:border-[#f97316]/20"
                }`}
              >
                <div className="w-8 flex items-center justify-center shrink-0">
                  {comic.rank <= 3 ? (
                    <Crown size={16} className="text-amber-400" />
                  ) : (
                    <span className="text-sm font-display font-bold text-[#5c5c6e]">{comic.rank}</span>
                  )}
                </div>
                <div className="w-11 h-14 rounded-lg overflow-hidden shrink-0 bg-[#1a1a24]">
                  {comic.comic_image ? (
                    <img
                      src={comic.comic_image}
                      alt={comic.comic_title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#3a3a4a]">
                      <ImageOff size={14} />
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-body font-medium text-[#c0c0d0] group-hover:text-[#f97316] transition-colors truncate">
                    {comic.comic_title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {comic.comic_type && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold uppercase bg-[#f97316]/15 text-[#f97316]">
                        {comic.comic_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#8e8ea0] shrink-0">
                  <Eye size={12} />
                  <span className="text-xs font-body font-medium">{formatViews(comic.weekly_views)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loadingComics && comics.length === 0 && (
        <div className="text-center py-12">
          <Trophy size={36} className="text-[#3a3a4a] mx-auto mb-3" />
          <p className="text-sm font-body text-[#8e8ea0]">Belum ada data peringkat. Mulai baca komik!</p>
        </div>
      )}

      {/* Streak Leaderboard */}
      <section className="mb-8">
        <h2 className="font-display text-base text-white/85 font-bold flex items-center gap-2 mb-2">
          <Crown size={18} className="text-amber-400" />
          Streak Leaderboard
        </h2>
        <p className="text-xs font-body text-[#8e8ea0] mb-4">Top pembaca dengan streak tertinggi</p>

        {loadingStreaks && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingStreaks && streakUsers.length > 0 && (
          <div className="space-y-2">
            {streakUsers.map((u) => (
              <div
                key={u.username}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  u.rank <= 3
                    ? "bg-gradient-to-r from-amber-500/10 to-[#12121a] border-amber-500/20"
                    : "bg-[#12121a] border-white/[0.04]"
                }`}
              >
                <div className="w-8 flex items-center justify-center shrink-0">
                  {u.rank === 1 ? <span className="text-lg">🥇</span>
                    : u.rank === 2 ? <span className="text-lg">🥈</span>
                    : u.rank === 3 ? <span className="text-lg">🥉</span>
                    : <span className="text-sm font-display font-bold text-[#5c5c6e]">{u.rank}</span>}
                </div>
                <div className="w-9 h-9 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-sm font-bold font-body shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    u.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-body font-medium text-[#c0c0d0] truncate">{u.username}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Flame size={14} className="text-orange-400" />
                  <span className="text-sm font-body font-bold text-orange-400">{u.current_streak}</span>
                  <span className="text-[10px] font-body text-[#5c5c6e]">hari</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingStreaks && streakUsers.length === 0 && (
          <div className="text-center py-8 rounded-xl bg-[#12121a] border border-white/[0.04]">
            <Flame size={28} className="text-[#3a3a4a] mx-auto mb-2" />
            <p className="text-sm font-body text-[#8e8ea0]">Belum ada data streak</p>
          </div>
        )}
      </section>

      {/* Streak Reward Banner */}
      <div className="rounded-xl bg-gradient-to-r from-[#f97316]/15 to-amber-500/10 border border-[#f97316]/20 p-5 text-center">
        <Gift size={28} className="text-[#f97316] mx-auto mb-2" />
        <p className="font-display font-bold text-white/85 text-sm mb-1">
          🔥 30 Hari Streak = Premium Bebas Iklan!
        </p>
        <p className="text-xs font-body text-[#8e8ea0]">
          Baca komik setiap hari selama 30 hari berturut-turut untuk mendapatkan reward bebas iklan selama 30 hari.
        </p>
      </div>
    </div>
  );
}
