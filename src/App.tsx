import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ReaderLayout from "./layouts/ReaderLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-load all pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const LatestPage = lazy(() => import("./pages/LatestPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const GenrePage = lazy(() => import("./pages/GenrePage"));
const GenreDetailPage = lazy(() => import("./pages/GenreDetailPage"));
const ComicDetailPage = lazy(() => import("./pages/ComicDetailPage"));
const TypePage = lazy(() => import("./pages/TypePage"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const BookmarkPage = lazy(() => import("./pages/BookmarkPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const AdminCommentsPage = lazy(() => import("./pages/admin/CommentsPage"));
const AdminAdsPage = lazy(() => import("./pages/admin/AdsPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/UsersPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/SettingsPage"));

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
