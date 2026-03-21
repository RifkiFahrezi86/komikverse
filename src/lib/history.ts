const STORAGE_KEY = "komikverse_history";
const MAX_ENTRIES = 500;

export interface ReadEntry {
  comicSlug: string;
  comicTitle: string;
  comicImage: string;
  comicType?: string;
  genres?: string[];
  chapterSlug: string;
  chapterTitle: string;
  readAt: number; // timestamp
}

export interface ReadingStats {
  totalChaptersRead: number;
  totalComicsRead: number;
  currentStreak: number;
  longestStreak: number;
  topGenres: { genre: string; count: number }[];
  recentComics: { slug: string; title: string; image: string; type?: string; lastRead: number; chaptersRead: number }[];
  readsByDay: Record<string, number>; // "YYYY-MM-DD" → count
}

function getHistory(): ReadEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: ReadEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function recordRead(entry: Omit<ReadEntry, "readAt">) {
  const history = getHistory();
  // Don't duplicate if same chapter was read in last 5 minutes
  const recent = history.find(
    (h) => h.chapterSlug === entry.chapterSlug && Date.now() - h.readAt < 5 * 60 * 1000
  );
  if (recent) return;
  history.push({ ...entry, readAt: Date.now() });
  saveHistory(history);

  // Sync streak to server in background
  try {
    const stats = getReadingStats();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    import("./api").then(({ syncStreak }) => {
      syncStreak(stats.currentStreak, stats.longestStreak, dateStr);
    });
  } catch { /* ignore */ }
}

/** Get the last chapter read for a specific comic */
export function getLastReadForComic(comicSlug: string): ReadEntry | null {
  const history = getHistory();
  const entries = history.filter((h) => h.comicSlug === comicSlug);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (a.readAt > b.readAt ? a : b));
}

/** Get all read chapter slugs for a specific comic */
export function getReadChapters(comicSlug: string): Set<string> {
  const history = getHistory();
  return new Set(history.filter((h) => h.comicSlug === comicSlug).map((h) => h.chapterSlug));
}

/** Get recently read comics for "Continue Reading" section */
export function getContinueReading(): {
  comicSlug: string;
  comicTitle: string;
  comicImage: string;
  comicType?: string;
  chapterSlug: string;
  chapterTitle: string;
  readAt: number;
  chaptersRead: number;
}[] {
  const history = getHistory();
  const comicMap = new Map<string, ReadEntry>();
  // Get the latest entry for each comic
  for (const h of history) {
    const existing = comicMap.get(h.comicSlug);
    if (!existing || h.readAt > existing.readAt) {
      comicMap.set(h.comicSlug, h);
    }
  }
  // Count chapters per comic
  const chapterCounts = new Map<string, number>();
  for (const h of history) {
    const existing = chapterCounts.get(h.comicSlug) || 0;
    chapterCounts.set(h.comicSlug, existing + 1);
  }
  // Deduplicate chapter slugs per comic for accurate count
  const uniqueChapterCounts = new Map<string, Set<string>>();
  for (const h of history) {
    if (!uniqueChapterCounts.has(h.comicSlug)) uniqueChapterCounts.set(h.comicSlug, new Set());
    uniqueChapterCounts.get(h.comicSlug)!.add(h.chapterSlug);
  }

  return [...comicMap.values()]
    .sort((a, b) => b.readAt - a.readAt)
    .slice(0, 10)
    .map((h) => ({
      comicSlug: h.comicSlug,
      comicTitle: h.comicTitle,
      comicImage: h.comicImage,
      comicType: h.comicType,
      chapterSlug: h.chapterSlug,
      chapterTitle: h.chapterTitle,
      readAt: h.readAt,
      chaptersRead: uniqueChapterCounts.get(h.comicSlug)?.size || 0,
    }));
}

function dayKey(ts: number): string {
  // Use local midnight-normalized date to avoid timezone-related streak breaks
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getReadingStats(): ReadingStats {
  const history = getHistory();

  // Total chapters & comics
  const uniqueChapters = new Set(history.map((h) => h.chapterSlug));
  const comicMap = new Map<string, { title: string; image: string; type?: string; lastRead: number; chapters: Set<string> }>();

  for (const h of history) {
    const existing = comicMap.get(h.comicSlug);
    if (existing) {
      existing.chapters.add(h.chapterSlug);
      if (h.readAt > existing.lastRead) existing.lastRead = h.readAt;
    } else {
      comicMap.set(h.comicSlug, {
        title: h.comicTitle,
        image: h.comicImage,
        type: h.comicType,
        lastRead: h.readAt,
        chapters: new Set([h.chapterSlug]),
      });
    }
  }

  // Genre counts
  const genreCounts = new Map<string, number>();
  for (const h of history) {
    if (h.genres) {
      for (const g of h.genres) {
        genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      }
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  // Reads by day
  const readsByDay: Record<string, number> = {};
  for (const h of history) {
    const key = dayKey(h.readAt);
    readsByDay[key] = (readsByDay[key] || 0) + 1;
  }

  // Streak calculation
  const daysWithReads = new Set(Object.keys(readsByDay));
  let currentStreak = 0;
  let longestStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count current streak (from today backwards)
  let checkDate = new Date(today);
  // If no reads today, check if yesterday had reads to start counting
  if (!daysWithReads.has(dayKey(checkDate.getTime()))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (daysWithReads.has(dayKey(checkDate.getTime()))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Longest streak
  const sortedDays = [...daysWithReads].sort();
  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    // Normalize to midnight to avoid DST/timezone drift
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak);
  if (sortedDays.length === 0) longestStreak = 0;

  // Recent comics (sorted by last read, top 10)
  const recentComics = [...comicMap.entries()]
    .map(([slug, data]) => ({
      slug,
      title: data.title,
      image: data.image,
      type: data.type,
      lastRead: data.lastRead,
      chaptersRead: data.chapters.size,
    }))
    .sort((a, b) => b.lastRead - a.lastRead)
    .slice(0, 10);

  return {
    totalChaptersRead: uniqueChapters.size,
    totalComicsRead: comicMap.size,
    currentStreak,
    longestStreak,
    topGenres,
    recentComics,
    readsByDay,
  };
}

/** Delete all entries for a specific comic from history */
export function deleteComicFromHistory(comicSlug: string): void {
  const entries = getHistory();
  const filtered = entries.filter(e => e.comicSlug !== comicSlug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/** Clear all reading history */
export function clearAllHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
