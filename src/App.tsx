import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ReaderLayout from "./layouts/ReaderLayout";
import HomePage from "./pages/HomePage";
import LatestPage from "./pages/LatestPage";
import SearchPage from "./pages/SearchPage";
import GenrePage from "./pages/GenrePage";
import GenreDetailPage from "./pages/GenreDetailPage";
import ComicDetailPage from "./pages/ComicDetailPage";
import TypePage from "./pages/TypePage";
import ReaderPage from "./pages/ReaderPage";
import BookmarkPage from "./pages/BookmarkPage";

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
    ],
  },
  {
    element: <ReaderLayout />,
    children: [{ path: "/baca/:slug", element: <ReaderPage /> }],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
