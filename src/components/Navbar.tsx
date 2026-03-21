import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, X, Compass, LayoutGrid, Library, BookOpen, Home, Bookmark, LogIn, LogOut, Shield, User as UserIcon, KeyRound, Trophy } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout, isAdmin } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close user menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().slice(0, 100);
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setQuery("");
      setSearchOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.04]"
            : "bg-transparent"
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-lg flex items-center justify-center">
                <BookOpen size={16} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white/85 tracking-tight">
                Komik<span className="text-[#f97316]">Verse</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/" active={isActive("/")} label="Home" />
              <NavLink to="/terbaru" active={isActive("/terbaru")} label="Terbaru" />
              <NavLink to="/genre" active={isActive("/genre")} label="Genre" />
              <NavLink to="/bookmark" active={isActive("/bookmark")} label="Bookmark" />
              <NavLink to="/ranking" active={isActive("/ranking")} label="Ranking" />
              <div className="relative group">
                <button className="px-3 py-1.5 text-sm font-body font-medium text-[#8e8ea0] hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]">
                  Type
                </button>
                <div className="absolute top-full right-0 mt-1 py-1 w-32 rounded-lg bg-[#16161f] border border-white/[0.06] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  <Link to="/type/manga" className="block px-3 py-2 text-sm font-body text-[#8e8ea0] hover:text-white hover:bg-white/[0.04] transition-colors">Manga</Link>
                  <Link to="/type/manhwa" className="block px-3 py-2 text-sm font-body text-[#8e8ea0] hover:text-white hover:bg-white/[0.04] transition-colors">Manhwa</Link>
                  <Link to="/type/manhua" className="block px-3 py-2 text-sm font-body text-[#8e8ea0] hover:text-white hover:bg-white/[0.04] transition-colors">Manhua</Link>
                </div>
              </div>
            </div>

            {/* Search + Auth */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#8e8ea0] hover:text-white hover:border-white/[0.1] transition-all text-sm"
              >
                <Search size={14} />
                <span className="hidden sm:inline font-body">Cari...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-[#5c5c6e]">
                  Ctrl K
                </kbd>
              </button>

              {/* User menu */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-xs font-bold font-body hover:bg-[#f97316]/30 transition-colors"
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-1 py-1 w-44 rounded-lg bg-[#16161f] border border-white/[0.06] shadow-xl z-50">
                      <div className="px-3 py-2 border-b border-white/[0.04]">
                        <p className="text-xs font-body font-medium text-white/85 truncate">{user.username}</p>
                        <p className="text-[10px] font-body text-[#5c5c6e]">{user.email}</p>
                      </div>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-body text-[#8e8ea0] hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <Shield size={14} /> Admin Panel
                        </Link>
                      )}
                      <Link
                        to="/change-password"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-body text-[#8e8ea0] hover:text-white hover:bg-white/[0.04] transition-colors"
                      >
                        <KeyRound size={14} /> Ganti Password
                      </Link>
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); navigate("/"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-body text-[#8e8ea0] hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                      >
                        <LogOut size={14} /> Keluar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-sm font-body font-medium hover:bg-[#ea580c] transition-colors"
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Masuk</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.04]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around py-2">
          <MobileNavItem to="/" icon={<Home size={20} />} label="Home" active={isActive("/")} />
          <MobileNavItem to="/genre" icon={<LayoutGrid size={20} />} label="Genre" active={isActive("/genre")} />
          <MobileNavItem to="/bookmark" icon={<Bookmark size={20} />} label="Library" active={isActive("/bookmark")} />
          <MobileNavItem to="/ranking" icon={<Trophy size={20} />} label="Ranking" active={isActive("/ranking")} />
          <MobileNavItem
            to={user ? "/profile" : "/login"}
            icon={<UserIcon size={20} />}
            label={user ? user.username.slice(0, 6) : "Masuk"}
            active={isActive("/profile") || isActive("/login")}
          />
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
          onClick={() => setSearchOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg mx-4 bg-[#16161f] rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearch} className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5c5c6e]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari komik, manga, manhwa..."
                className="w-full pl-12 pr-12 py-4 bg-transparent text-white/85 text-base font-body placeholder:text-[#5c5c6e] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md bg-white/[0.06] text-[#5c5c6e] hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </form>
            <div className="border-t border-white/[0.04] px-4 py-3">
              <p className="text-xs text-[#5c5c6e] font-body">
                Tekan <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono">Enter</kbd> untuk mencari
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 text-sm font-body font-medium rounded-lg transition-colors ${
        active
          ? "text-white bg-white/[0.06]"
          : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      {label}
    </Link>
  );
}

function MobileNavItem({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
        active ? "text-[#f97316]" : "text-[#5c5c6e]"
      }`}
    >
      {icon}
      <span className="text-[10px] font-body font-medium">{label}</span>
    </Link>
  );
}
