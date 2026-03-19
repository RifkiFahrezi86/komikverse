import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ReaderLayout from "./layouts/ReaderLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Auto-retry dynamic import — reload page if chunk is missing (new deploy)
function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch(() => {
      // Chunk failed to load (likely new deploy), reload once
      const key = "chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
      return importFn();
    })
  );
}

// Lazy-load all pages for code splitting
const HomePage = lazyRetry(() => import("./pages/HomePage"));
const LatestPage = lazyRetry(() => import("./pages/LatestPage"));
const SearchPage = lazyRetry(() => import("./pages/SearchPage"));
const GenrePage = lazyRetry(() => import("./pages/GenrePage"));
const GenreDetailPage = lazyRetry(() => import("./pages/GenreDetailPage"));
const ComicDetailPage = lazyRetry(() => import("./pages/ComicDetailPage"));
const TypePage = lazyRetry(() => import("./pages/TypePage"));
const ReaderPage = lazyRetry(() => import("./pages/ReaderPage"));
const BookmarkPage = lazyRetry(() => import("./pages/BookmarkPage"));
const LoginPage = lazyRetry(() => import("./pages/LoginPage"));
const RegisterPage = lazyRetry(() => import("./pages/RegisterPage"));
const ChangePasswordPage = lazyRetry(() => import("./pages/ChangePasswordPage"));
const ProfilePage = lazyRetry(() => import("./pages/ProfilePage"));
const AdminLayout = lazyRetry(() => import("./layouts/AdminLayout"));
const AdminDashboardPage = lazyRetry(() => import("./pages/admin/DashboardPage"));
const AdminCommentsPage = lazyRetry(() => import("./pages/admin/CommentsPage"));
const AdminAdsPage = lazyRetry(() => import("./pages/admin/AdsPage"));
const AdminUsersPage = lazyRetry(() => import("./pages/admin/UsersPage"));
const AdminSettingsPage = lazyRetry(() => import("./pages/admin/SettingsPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <SuspenseWrap><HomePage /></SuspenseWrap> },
      { path: "/terbaru", element: <SuspenseWrap><LatestPage /></SuspenseWrap> },
      { path: "/search", element: <SuspenseWrap><SearchPage /></SuspenseWrap> },
      { path: "/genre", element: <SuspenseWrap><GenrePage /></SuspenseWrap> },
      { path: "/genre/:slug", element: <SuspenseWrap><GenreDetailPage /></SuspenseWrap> },
      { path: "/type/:type", element: <SuspenseWrap><TypePage /></SuspenseWrap> },
      { path: "/komik/:slug", element: <SuspenseWrap><ComicDetailPage /></SuspenseWrap> },
      { path: "/bookmark", element: <SuspenseWrap><BookmarkPage /></SuspenseWrap> },
      { path: "/profile", element: <SuspenseWrap><ProfilePage /></SuspenseWrap> },
      { path: "/login", element: <SuspenseWrap><LoginPage /></SuspenseWrap> },
      { path: "/register", element: <SuspenseWrap><RegisterPage /></SuspenseWrap> },
      { path: "/change-password", element: <ProtectedRoute><SuspenseWrap><ChangePasswordPage /></SuspenseWrap></ProtectedRoute> },
    ],
  },
  {
    element: <ReaderLayout />,
    children: [{ path: "/baca/:slug", element: <SuspenseWrap><ReaderPage /></SuspenseWrap> }],
  },
  {
    element: (
      <SuspenseWrap>
        <ProtectedRoute adminOnly>
          <AdminLayout />
        </ProtectedRoute>
      </SuspenseWrap>
    ),
    children: [
      { path: "/admin", element: <SuspenseWrap><AdminDashboardPage /></SuspenseWrap> },
      { path: "/admin/comments", element: <SuspenseWrap><AdminCommentsPage /></SuspenseWrap> },
      { path: "/admin/ads", element: <SuspenseWrap><AdminAdsPage /></SuspenseWrap> },
      { path: "/admin/users", element: <SuspenseWrap><AdminUsersPage /></SuspenseWrap> },
      { path: "/admin/settings", element: <SuspenseWrap><AdminSettingsPage /></SuspenseWrap> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
