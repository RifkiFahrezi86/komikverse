import { useState } from "react";
import { Bookmark as BookmarkIcon, Trash2 } from "lucide-react";
import type { Comic } from "../lib/api";
import { getBookmarks, removeBookmark } from "../lib/bookmark";
import ComicCard from "../components/ComicCard";

export default function BookmarkPage() {
  const [bookmarks, setBookmarks] = useState<Comic[]>(getBookmarks());

  const handleRemove = (href: string) => {
    removeBookmark(href);
    setBookmarks(getBookmarks());
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-20 pb-20 md:pb-12">
      <h1 className="font-display text-xl sm:text-2xl text-white/85 flex items-center gap-2.5 mb-6 font-bold">
        <BookmarkIcon size={22} className="text-[#f97316]" />
        Bookmark
      </h1>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20">
          <BookmarkIcon size={48} className="text-[#2a2a3a] mx-auto mb-3" />
          <p className="text-[#5c5c6e] font-body">
            Belum ada komik yang di-bookmark
          </p>
          <p className="text-[#3a3a4a] font-body text-xs mt-1">
            Klik tombol bookmark di halaman detail komik untuk menyimpannya
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[#5c5c6e] font-body">
              {bookmarks.length} komik tersimpan
            </p>
            <button
              onClick={() => {
                if (confirm("Hapus semua bookmark?")) {
                  localStorage.removeItem("komikverse_bookmarks");
                  setBookmarks([]);
                }
              }}
              className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 font-body font-medium transition-colors"
            >
              <Trash2 size={12} /> Hapus Semua
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {bookmarks.map((comic) => (
              <div key={comic.href} className="relative group">
                <ComicCard comic={comic} />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(comic.href);
                  }}
                  className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-md bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  title="Hapus dari bookmark"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
