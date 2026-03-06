import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ReaderLayout from "./layouts/ReaderLayout";
import AdminLayout from "./layouts/AdminLayout";
import HomePage from "./pages/HomePage";
import LatestPage from "./pages/LatestPage";
import SearchPage from "./pages/SearchPage";
import GenrePage from "./pages/GenrePage";
import GenreDetailPage from "./pages/GenreDetailPage";
import ComicDetailPage from "./pages/ComicDetailPage";
import TypePage from "./pages/TypePage";
import ReaderPage from "./pages/ReaderPage";
import BookmarkPage from "./pages/BookmarkPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminCommentsPage from "./pages/admin/CommentsPage";
import AdminAdsPage from "./pages/admin/AdsPage";
import AdminUsersPage from "./pages/admin/UsersPage";
import AdminSettingsPage from "./pages/admin/SettingsPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/terbaru", element: <LatestPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/genre", element: <GenrePage /> },
      { path: "/genre/:slug", element: <GenreDetailPage /> },
      { path: "/type/:type", element: <TypePage /> },
      { path: "/komik/:slug", element: <ComicDetailPage /> },
      { path: "/bookmark", element: <BookmarkPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/change-password", element: <ProtectedRoute><ChangePasswordPage /></ProtectedRoute> },
    ],
  },
  {
    element: <ReaderLayout />,
    children: [{ path: "/baca/:slug", element: <ReaderPage /> }],
  },
  {
    element: (
      <ProtectedRoute adminOnly>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/admin", element: <AdminDashboardPage /> },
      { path: "/admin/comments", element: <AdminCommentsPage /> },
      { path: "/admin/ads", element: <AdminAdsPage /> },
      { path: "/admin/users", element: <AdminUsersPage /> },
      { path: "/admin/settings", element: <AdminSettingsPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
