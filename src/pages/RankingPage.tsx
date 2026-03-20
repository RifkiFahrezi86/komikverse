import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Eye, Flame, Crown, Star, Gift, ImageOff, BarChart3 } from "lucide-react";
import type { Comic } from "../lib/api";
import { getAllPopular, getStreakLeaderboard, formatViews } from "../lib/api";

const TYPE_TABS = [
  { key: "all", label: "Semua" },
  { key: "manhwa", label: "Manhwa" },
  { key: "manga", label: "Manga" },
  { key: "manhua", label: "Manhua" },
];

interface StreakUser {
  rank: number;
  username: string;
  avatar_url?: string;
  current_streak: number;
  longest_streak: number;
}

function extractSlug(href: string): string {
  return href?.split("/").filter(Boolean).pop() || "";
}

function PodiumCard({ comic, position }: { comic: Comic; position: 1 | 2 | 3 }) {
  const config = {
    1: { img: "w-28 h-28 sm:w-32 sm:h-32", ring: "ring-[#f97316]", badge: "bg-[#f97316]", badgeSize: "w-7 h-7 text-xs", barH: "h-28 sm:h-32", barBg: "bg-gradient-to-t from-[#8B6914] to-[#C9A227]", mt: "", width: "w-[130px] sm:w-[150px]" },
    2: { img: "w-20 h-20 sm:w-24 sm:h-24", ring: "ring-[#94a3b8]", badge: "bg-[#94a3b8]", badgeSize: "w-6 h-6 text-[10px]", barH: "h-20 sm:h-24", barBg: "bg-gradient-to-t from-[#4a4a3a] to-[#7a7a5a]", mt: "mt-8", width: "w-[110px] sm:w-[130px]" },
    3: { img: "w-20 h-20 sm:w-24 sm:h-24", ring: "ring-[#cd7f32]", badge: "bg-[#cd7f32]", badgeSize: "w-6 h-6 text-[10px]", barH: "h-16 sm:h-20", barBg: "bg-gradient-to-t from-[#5a3a1a] to-[#8B5E3C]", mt: "mt-10", width: "w-[110px] sm:w-[130px]" },
  };
  const s = config[position];

  return (
    <Link to={`/komik/${extractSlug(comic.href)}`} className={`flex flex-col items-center ${s.mt} group ${s.width}`}>
      <div className={`relative ${s.img} rounded-full overflow-hidden ring-4 ${s.ring} bg-[#1a1a24] mb-1`}>
        {comic.image ? (
          <img
            src={comic.image}
            alt={comic.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#3a3a4a]">
            <ImageOff size={20} />
          </div>
        )}
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${s.badgeSize} rounded-full ${s.badge} flex items-center justify-center text-white font-bold shadow-lg`}>
          {position}
        </div>
      </div>
      {position === 1 && <Flame size={16} className="text-[#f97316] animate-pulse" />}
      <p className="text-xs font-body font-medium text-[#c0c0d0] group-hover:text-[#f97316] transition-colors text-center max-w-full truncate">
        {comic.title}
      </p>
      {comic.rating && (
        <span className="flex items-center gap-0.5 text-[10px] font-body text-[#8e8ea0]">
          <Star size={8} className="text-amber-400" /> {comic.rating}
        </span>
      )}
      {/* Podium Bar */}
      <div className={`w-full ${s.barH} ${s.barBg} rounded-t-xl mt-1 flex flex-col items-center justify-end pb-2 opacity-80`}>
        {comic.view_count && comic.view_count > 0 && (
          <div className="flex items-center gap-0.5 text-white/70">
            <Eye size={9} />
            <span className="text-[9px] font-body font-medium">{formatViews(comic.view_count)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function RankingPage() {
  const [mainTab, setMainTab] = useState<"ranking" | "streak">("ranking");
  const [comicTab, setComicTab] = useState("all");
  const [allComics, setAllComics] = useState<Comic[]>([]);
  const [streakUsers, setStreakUsers] = useState<StreakUser[]>([]);
  const [loadingComics, setLoadingComics] = useState(true);
  const [loadingStreaks, setLoadingStreaks] = useState(true);

  useEffect(() => {
    getAllPopular().then((comics) => {
      setAllComics(comics);
      setLoadingComics(false);
    });
    getStreakLeaderboard(20).then((data) => {
      setStreakUsers(data);
      setLoadingStreaks(false);
    });
  }, []);

  const filtered = (comicTab === "all" ? allComics : allComics.filter(c => c.type?.toLowerCase() === comicTab))
    .slice()
    .sort((a, b) => {
      const ra = parseFloat(String(a.rating || "0")) || 0;
      const rb = parseFloat(String(b.rating || "0")) || 0;
      if (ra > 0 && rb <= 0) return -1;
      if (rb > 0 && ra <= 0) return 1;
      return rb - ra;
    });

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top pb-20 md:pb-12">
      {/* Main Tabs: Peringkat vs Streak */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setMainTab("ranking")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display font-bold transition-all ${
            mainTab === "ranking"
              ? "bg-[#f97316] text-white shadow-lg shadow-[#f97316]/20"
              : "bg-[#12121a] text-[#8e8ea0] border border-white/[0.06] hover:text-white hover:border-[#f97316]/30"
          }`}
        >
          <Trophy size={18} />
          Papan Peringkat
        </button>
        <button
          onClick={() => setMainTab("streak")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display font-bold transition-all ${
            mainTab === "streak"
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
              : "bg-[#12121a] text-[#8e8ea0] border border-white/[0.06] hover:text-white hover:border-amber-500/30"
          }`}
        >
          <Flame size={18} />
          Streak Leaderboard
        </button>
      </div>

      {/* ===== RANKING TAB ===== */}
      {mainTab === "ranking" && <>
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

      {/* Podium Top 3 with Bar Chart */}
      {!loadingComics && filtered.length >= 3 && (
        <div className="flex justify-center items-end gap-2 sm:gap-4 mb-8">
          <PodiumCard comic={filtered[1]} position={2} />
          <PodiumCard comic={filtered[0]} position={1} />
          <PodiumCard comic={filtered[2]} position={3} />
        </div>
      )}

      {loadingComics && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Full Rankings */}
      {filtered.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-base text-white/85 font-bold flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-[#f97316]" />
            Peringkat Lengkap
          </h2>
          <div className="space-y-2">
            {filtered.map((comic, idx) => {
              const rank = idx + 1;
              const slug = extractSlug(comic.href);
              return (
                <Link
                  key={slug}
                  to={`/komik/${slug}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                    rank <= 3
                      ? "bg-gradient-to-r from-[#f97316]/10 to-[#12121a] border-[#f97316]/20"
                      : "bg-[#12121a] border-white/[0.04] hover:border-[#f97316]/20"
                  }`}
                >
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {rank <= 3 ? (
                      <div className="flex flex-col items-center">
                        <Crown size={16} className="text-amber-400" />
                        <span className="text-[10px] font-display font-bold text-amber-400">{rank}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-display font-bold text-[#5c5c6e]">{rank}</span>
                    )}
                  </div>
                  <div className="w-11 h-14 rounded-lg overflow-hidden shrink-0 bg-[#1a1a24]">
                    {comic.image ? (
                      <img
                        src={comic.image}
                        alt={comic.title}
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
                      {comic.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {comic.type && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold uppercase bg-[#f97316]/15 text-[#f97316]">
                          {comic.type}
                        </span>
                      )}
                      {comic.chapter && (
                        <span className="text-[10px] font-body text-[#5c5c6e]">{comic.chapter}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {comic.rating && (
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-amber-400" />
                        <span className="text-xs font-body font-semibold text-amber-400">{comic.rating}</span>
                      </div>
                    )}
                    {comic.view_count && comic.view_count > 0 && (
                      <div className="flex items-center gap-1 text-[#8e8ea0]">
                        <Eye size={10} />
                        <span className="text-[10px] font-body font-medium">{formatViews(comic.view_count)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!loadingComics && filtered.length === 0 && (
        <div className="text-center py-12">
          <Trophy size={36} className="text-[#3a3a4a] mx-auto mb-3" />
          <p className="text-sm font-body text-[#8e8ea0]">Belum ada data peringkat. Mulai baca komik!</p>
        </div>
      )}
      </>}

      {/* ===== STREAK TAB ===== */}
      {mainTab === "streak" && <>
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
      </>}
    </div>
  );
}
