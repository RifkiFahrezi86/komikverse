import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame,
  BookOpen,
  Library,
  Trophy,
  Heart,
  KeyRound,
  LogOut,
  Shield,
  ChevronRight,
  ImageOff,
  Trash2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { getReadingStats, deleteComicFromHistory, clearAllHistory, type ReadingStats } from "../lib/history";

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-[#12121a] border border-white/[0.04] p-4 flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-xl font-display font-bold text-white/85">{value}</p>
      <p className="text-[11px] font-body text-[#8e8ea0] text-center">{label}</p>
    </div>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function ProfilePage() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReadingStats | null>(null);

  useEffect(() => {
    setStats(getReadingStats());
  }, []);

  if (!user) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top pb-20 md:pb-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-16 h-16 rounded-full bg-[#f97316]/20 flex items-center justify-center">
            <BookOpen size={28} className="text-[#f97316]" />
          </div>
          <p className="text-[#8e8ea0] font-body text-sm">Masuk untuk melihat profil kamu</p>
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-lg bg-[#f97316] text-white font-body font-semibold text-sm hover:bg-[#ea580c] transition-colors"
          >
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 page-top pb-20 md:pb-12">
      {/* Profile Header */}
      <div className="rounded-xl bg-gradient-to-br from-[#f97316]/10 to-[#12121a] border border-white/[0.04] p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-2xl font-bold font-display shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl text-white/85 font-bold truncate">{user.username}</h1>
            <p className="text-xs font-body text-[#8e8ea0] truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold uppercase ${
                user.role === "owner"
                  ? "bg-amber-500/15 text-amber-400"
                  : user.role === "admin"
                    ? "bg-blue-500/15 text-blue-400"
                    : "bg-emerald-500/15 text-emerald-400"
              }`}>
                {user.role}
              </span>
              {stats && stats.currentStreak > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-body font-bold bg-orange-500/15 text-orange-400">
                  <Flame size={10} /> {stats.currentStreak} hari streak
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<BookOpen size={20} className="text-[#f97316]" />}
            value={stats.totalChaptersRead}
            label="Chapter Dibaca"
            color="bg-[#f97316]/15"
          />
          <StatCard
            icon={<Library size={20} className="text-blue-400" />}
            value={stats.totalComicsRead}
            label="Komik Dibaca"
            color="bg-blue-500/15"
          />
          <StatCard
            icon={<Flame size={20} className="text-orange-400" />}
            value={stats.currentStreak}
            label="Streak Saat Ini"
            color="bg-orange-500/15"
          />
          <StatCard
            icon={<Trophy size={20} className="text-amber-400" />}
            value={stats.longestStreak}
            label="Streak Terpanjang"
            color="bg-amber-500/15"
          />
        </div>
      )}

      {/* Genre Favorit */}
      {stats && stats.topGenres.length > 0 && (
        <section className="mb-6">
          <h2 className="flex items-center gap-2 font-display text-base text-white/85 font-bold mb-3">
            <Heart size={16} className="text-pink-400" />
            Genre Favoritmu
          </h2>
          <div className="rounded-xl bg-[#12121a] border border-white/[0.04] p-4">
            <p className="text-xs font-body text-[#8e8ea0] mb-3">
              Berdasarkan kebiasaan bacamu, kamu penyuka genre ini:
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.topGenres.map((g, i) => (
                <Link
                  key={g.genre}
                  to={`/genre/${encodeURIComponent(g.genre.toLowerCase())}`}
                  state={{ name: g.genre }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:scale-105 ${
                    i === 0
                      ? "bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]"
                      : "bg-white/[0.03] border-white/[0.06] text-[#c0c0d0]"
                  }`}
                >
                  <span className="text-sm font-body font-medium">{g.genre}</span>
                  <span className={`text-[10px] font-body font-bold px-1.5 py-0.5 rounded ${
                    i === 0 ? "bg-[#f97316]/20" : "bg-white/[0.06]"
                  }`}>
                    {g.count}x
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Terakhir Dibaca */}
      {stats && stats.recentComics.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 font-display text-base text-white/85 font-bold">
              <BookOpen size={16} className="text-[#f97316]" />
              Terakhir Dibaca
            </h2>
            <button
              onClick={() => { if (confirm("Yakin ingin menghapus semua riwayat baca?")) { clearAllHistory(); setStats(getReadingStats()); } }}
              className="text-[10px] font-body font-medium text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              Hapus Semua
            </button>
          </div>
          <div className="space-y-2">
            {stats.recentComics.map((comic) => (
              <div
                key={comic.slug}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-white/[0.04] hover:border-[#f97316]/20 transition-all group"
              >
                <Link to={`/komik/${comic.slug}`} className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-[#1a1a24]">
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
                      <ImageOff size={16} />
                    </div>
                  )}
                </Link>
                <Link to={`/komik/${comic.slug}`} className="flex-grow min-w-0">
                  <p className="text-sm font-body font-medium text-[#c0c0d0] group-hover:text-[#f97316] transition-colors truncate">
                    {comic.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {comic.type && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold uppercase bg-[#f97316]/15 text-[#f97316]">
                        {comic.type}
                      </span>
                    )}
                    <span className="text-[10px] font-body text-[#5c5c6e]">
                      {comic.chaptersRead} chapter · {formatDate(comic.lastRead)}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteComicFromHistory(comic.slug); setStats(getReadingStats()); }}
                  className="p-1.5 rounded-lg text-[#5c5c6e] hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                >
                  <Trash2 size={14} />
                </button>
                <Link to={`/komik/${comic.slug}`}>
                  <ChevronRight size={16} className="text-[#3a3a4a] group-hover:text-[#f97316] transition-colors shrink-0" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {stats && stats.totalChaptersRead === 0 && (
        <div className="rounded-xl bg-[#12121a] border border-white/[0.04] p-8 text-center mb-6">
          <BookOpen size={36} className="text-[#3a3a4a] mx-auto mb-3" />
          <p className="text-sm font-body text-[#8e8ea0] mb-1">Belum ada riwayat bacaan</p>
          <p className="text-xs font-body text-[#5c5c6e]">Mulai baca komik untuk melihat statistik kamu di sini!</p>
        </div>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="flex items-center gap-2 font-display text-base text-white/85 font-bold mb-3">
          Pengaturan
        </h2>
        <div className="space-y-1">
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-white/[0.04] hover:border-[#f97316]/20 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Shield size={16} className="text-blue-400" />
              </div>
              <span className="text-sm font-body font-medium text-[#c0c0d0] group-hover:text-white transition-colors">Admin Panel</span>
              <ChevronRight size={16} className="text-[#3a3a4a] ml-auto" />
            </Link>
          )}
          <Link
            to="/change-password"
            className="flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-white/[0.04] hover:border-[#f97316]/20 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <KeyRound size={16} className="text-[#f97316]" />
            </div>
            <span className="text-sm font-body font-medium text-[#c0c0d0] group-hover:text-white transition-colors">Ganti Password</span>
            <ChevronRight size={16} className="text-[#3a3a4a] ml-auto" />
          </Link>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-white/[0.04] hover:border-red-500/20 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
              <LogOut size={16} className="text-red-400" />
            </div>
            <span className="text-sm font-body font-medium text-[#c0c0d0] group-hover:text-red-400 transition-colors">Keluar</span>
          </button>
        </div>
      </section>
    </div>
  );
}
