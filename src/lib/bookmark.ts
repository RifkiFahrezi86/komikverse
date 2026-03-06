import type { Comic } from "./api";

const STORAGE_KEY = "komikverse_bookmarks";

export function getBookmarks(): Comic[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addBookmark(comic: Comic): void {
  const bookmarks = getBookmarks();
  if (!bookmarks.find((b) => b.href === comic.href)) {
    bookmarks.push(comic);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(href: string): void {
  const bookmarks = getBookmarks().filter((b) => b.href !== href);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(href: string): boolean {
  return getBookmarks().some((b) => b.href === href);
}
