import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  BookOpen,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/comments", icon: MessageSquare, label: "Komentar" },
  { to: "/admin/users", icon: Users, label: "Pengguna" },
  { to: "/admin/settings", icon: Settings, label: "Pengaturan" },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0e0e16] border-r border-white/[0.04] flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.04]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-sm text-white/85">
              Komik<span className="text-[#f97316]">Verse</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#5c5c6e] hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to, item.end);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${
                  active
                    ? "bg-[#f97316]/10 text-[#f97316]"
                    : "text-[#8e8ea0] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-white/[0.04]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-xs font-bold font-body">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body font-medium text-white/85 truncate">{user?.username}</p>
              <p className={`text-[10px] font-body uppercase tracking-wider ${user?.role === "owner" ? "text-yellow-400" : "text-[#5c5c6e]"}`}>{user?.role}</p>
            </div>
            <Link to="/change-password" className="text-[#5c5c6e] hover:text-[#f97316] transition-colors" title="Ganti Password">
              <KeyRound size={16} />
            </Link>
            <button onClick={handleLogout} className="text-[#5c5c6e] hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.04] flex items-center justify-between px-4 lg:px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#8e8ea0] hover:text-white">
              <Menu size={20} />
            </button>
            <h1 className="font-display text-sm font-bold text-white/85">Admin Panel</h1>
          </div>
          <Link to="/" className="flex items-center gap-1.5 text-xs font-body text-[#8e8ea0] hover:text-white transition-colors">
            <ChevronLeft size={14} /> Kembali ke Situs
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
