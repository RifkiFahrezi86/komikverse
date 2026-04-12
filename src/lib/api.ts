const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const DEFAULT_PROVIDER = import.meta.env.VITE_API_PROVIDER || "shinigami";
const API_SECRET = import.meta.env.VITE_API_SECRET || "";

// Dynamic provider management
let currentProvider = (() => {
  try { return localStorage.getItem("comic-provider") || DEFAULT_PROVIDER; }
  catch { return DEFAULT_PROVIDER; }
})();

export const PROVIDERS = [
  { id: "shinigami", name: "Shinigami", icon: "🔮" },
  { id: "komiku", name: "Komiku", icon: "📚" },
  { id: "kiryuu", name: "Kiryuu", icon: "⚔️" },
] as const;

export function getProvider(): string {
  return currentProvider;
}

export function setProvider(provider: string) {
  currentProvider = provider;
  try { localStorage.setItem("comic-provider", provider); } catch {}
}

// In-memory response cache with TTL
const responseCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const inflight = new Map<string, Promise<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  if (entry) responseCache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttl = CACHE_TTL) {
  responseCache.set(key, { data, expires: Date.now() + ttl });
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of responseCache.entries()) {
      if (v.expires < now) responseCache.delete(k);
    }
    if (responseCache.size > 100) {
      const first = responseCache.keys().next().value;
      if (first) responseCache.delete(first);
    }
  }
}

// Generate HMAC token for API authentication — cache the CryptoKey
let cachedKey: CryptoKey | null = null;
let cachedKeySecret = "";

async function generateAuthHeaders(): Promise<Record<string, string>> {
  if (!API_SECRET) return {};
  const timestamp = String(Date.now());
  const encoder = new TextEncoder();
  if (!cachedKey || cachedKeySecret !== API_SECRET) {
    cachedKey = await crypto.subtle.importKey(
      "raw", encoder.encode(API_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    cachedKeySecret = API_SECRET;
  }
  const signature = await crypto.subtle.sign("HMAC", cachedKey, encoder.encode(timestamp));
  const token = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  return { "X-Api-Token": token, "X-Api-Timestamp": timestamp };
}

export interface Comic {
  title: string;
  image: string;
  href: string;
  type?: string;
  chapter?: string;
  rating?: string | number;
  description?: string;
  genre?: string;
  status?: string;
  author?: string;
  view_count?: number;
  _provider?: string;
}

export interface ComicDetail {
  title: string;
  image: string;
  description: string;
  type?: string;
  status?: string;
  author?: string;
  artist?: string;
  genre?: Array<{ title: string; href: string }> | string[];
  rating?: string | number;
  chapters: Chapter[];
  alternative?: string;
  released?: string;
}

export interface Chapter {
  title: string;
  href: string;
  date?: string;
  number?: number;
  provider?: string;
}

export interface ChapterData {
  title: string;
  panel: string[];
}

export interface Genre {
  title: string;
  href: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  current_page?: number;
  length_page?: number;
  has_next?: boolean;
  has_prev?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeComic(raw: any): Comic {
  return {
    title: raw.title || "",
    image: raw.thumbnail || raw.image || "",
    href: raw.href || "",
    type: raw.type,
    chapter: raw.chapter,
    rating: raw.rating,
    description: raw.description,
    genre: raw.genre,
    status: raw.status,
    author: raw.author,
    view_count: raw.view_count || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDetail(raw: any): ComicDetail {
  return {
    title: raw.title || "",
    image: raw.thumbnail || raw.image || "",
    description: raw.description || "",
    type: raw.type,
    status: raw.status,
    author: raw.author,
    artist: raw.artist,
    genre: raw.genre || [],
    rating: raw.rating,
    chapters: (raw.chapter || raw.chapters || []).map(normalizeChapter),
    alternative: raw.alternative,
    released: raw.released,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeChapter(raw: any): Chapter {
  return {
    title: raw.title || "",
    href: raw.href || "",
    date: raw.date,
    number: raw.number,
  };
}

function buildUrl(endpoint: string, provider = currentProvider): string {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${API_BASE}${endpoint}${separator}provider=${provider}`;
}

const FETCH_TIMEOUT = 8000;

async function fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
  // Delegate to fetchApiWithProvider which handles Kiryuu direct API
  return fetchApiWithProvider<T>(endpoint, currentProvider);
}

async function fetchApiWithProvider<T>(endpoint: string, provider: string): Promise<ApiResponse<T>> {
  const cacheKey = `${endpoint}|${provider}`;
  const cached = getCached<ApiResponse<T>>(cacheKey);
  if (cached) return cached;

  if (inflight.has(cacheKey)) return inflight.get(cacheKey) as Promise<ApiResponse<T>>;

  const promise = (async () => {
    // For Kiryuu: call WP REST API directly from browser (Cloudflare blocks Vercel IPs)
    if (provider === "kiryuu") {
      try {
        const { kiryuuDirectFetch } = await import("./kiryuuApi");
        const directResult = await kiryuuDirectFetch<T>(endpoint);
        if (directResult) {
          setCache(cacheKey, directResult);
          return directResult;
        }
      } catch { /* fall through to backend */ }
    }

    const url = buildUrl(endpoint, provider);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      const authHeaders = await generateAuthHeaders();
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { ...authHeaders },
      });
      if (res.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi nanti.");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: ApiResponse<T> = await res.json();
      setCache(cacheKey, data);
      return data;
    } finally {
      clearTimeout(timeoutId);
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

// Fetch from all providers and merge results with dedup
async function fetchAllProviders(endpoint: string): Promise<Comic[]> {
  const results = await Promise.allSettled(
    PROVIDERS.map(async (p) => {
      try {
        const res = await fetchApiWithProvider<Comic[]>(endpoint, p.id);
        return (res.data || []).map((raw) => ({ ...normalizeComic(raw), _provider: p.id }));
      } catch {
        return [];
      }
    })
  );
  const all: Comic[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const comic of result.value) {
        const key = comic.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seen.has(key)) {
          seen.add(key);
          all.push(comic);
        }
      }
    }
  }
  return all;
}

// Homepage functions — use primary provider (Shinigami) for fast loading
// Phase 2 enrichment from other providers is handled by the *More() helpers below
export async function getLatest(page = 1): Promise<ApiResponse<Comic[]>> {
  return fetchApiWithProvider<Comic[]>(`/terbaru?page=${page}`, "shinigami");
}

export async function getPopular(): Promise<ApiResponse<Comic[]>> {
  return fetchApiWithProvider<Comic[]>("/popular", "shinigami");
}

export async function getRecommended(): Promise<ApiResponse<Comic[]>> {
  return fetchApiWithProvider<Comic[]>("/recommended", "shinigami");
}

// Fetch comics from secondary providers (for background enrichment)
async function fetchSecondaryProviders(endpoint: string): Promise<Comic[]> {
  const others = PROVIDERS.filter(p => p.id !== "shinigami");
  const results = await Promise.allSettled(
    others.map(async (p) => {
      try {
        const res = await fetchApiWithProvider<Comic[]>(endpoint, p.id);
        return (res.data || []).map((raw) => ({ ...normalizeComic(raw), _provider: p.id }));
      } catch {
        return [];
      }
    })
  );
  const all: Comic[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all;
}

export async function getPopularMore(): Promise<Comic[]> {
  return fetchSecondaryProviders("/popular");
}

// Fetch popular comics from ALL providers (for ranking page)
export async function getAllPopular(): Promise<Comic[]> {
  return fetchAllProviders("/popular");
}

export async function getLatestMore(): Promise<Comic[]> {
  return fetchSecondaryProviders("/terbaru?page=1");
}

export async function getRecommendedMore(): Promise<Comic[]> {
  return fetchSecondaryProviders("/recommended");
}

export async function searchComics(keyword: string): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders(`/search?keyword=${encodeURIComponent(keyword)}`);
  return { status: "Ok", data };
}

export async function getComicDetail(slug: string): Promise<ApiResponse<ComicDetail>> {
  // Try current provider first for fast response
  const primary = currentProvider;
  try {
    const res = await fetchApiWithProvider<ComicDetail>(`/detail/${slug}`, primary);
    if (res.data) {
      return { status: "Ok", data: normalizeDetail(res.data) };
    }
  } catch { /* fall through to other providers */ }

  // Primary failed — try remaining providers in parallel
  const others = PROVIDERS.filter(p => p.id !== primary);
  const results = await Promise.allSettled(
    others.map(async (p) => {
      const res = await fetchApiWithProvider<ComicDetail>(`/detail/${slug}`, p.id);
      if (res.data) return { provider: p.id, data: normalizeDetail(res.data) };
      throw new Error("No data");
    })
  );

  let best: { provider: string; data: ComicDetail } | null = null;
  for (const r of results) {
    if (r.status === "fulfilled") {
      const chapters = r.value.data.chapters?.length || 0;
      const bestChapters = best?.data.chapters?.length || 0;
      if (!best || chapters > bestChapters) best = r.value;
    }
  }

  if (best) {
    setProvider(best.provider);
    return { status: "Ok", data: best.data };
  }
  throw new Error("Comic not found in any provider");
}

export async function getChapterImages(slug: string): Promise<ApiResponse<ChapterData[]>> {
  // Try current provider first for fast response
  const primary = currentProvider;
  try {
    const res = await fetchApiWithProvider<ChapterData[]>(`/read/${slug}`, primary);
    if (res.data && res.data.length > 0 && res.data[0]?.panel?.length > 0) return res;
  } catch { /* fall through */ }

  // Primary failed — try others in parallel
  const others = PROVIDERS.filter(p => p.id !== primary);
  const results = await Promise.allSettled(
    others.map(async (p) => {
      const res = await fetchApiWithProvider<ChapterData[]>(`/read/${slug}`, p.id);
      if (res.data && res.data.length > 0 && res.data[0]?.panel?.length > 0) return res;
      throw new Error("No panels");
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") return r.value;
  }
  throw new Error("Chapter not found in any provider");
}

export async function getGenres(): Promise<ApiResponse<Genre[]>> {
  // Use current provider only for speed — no need to merge all 3
  return fetchApiWithProvider<Genre[]>("/genre", currentProvider);
}

export async function getComicsByGenre(slug: string, page = 1): Promise<ApiResponse<Comic[]>> {
  // Use current provider only for speed
  return fetchApiWithProvider<Comic[]>(`/genre/${slug}?page=${page}`, currentProvider);
}

// ─── View Tracking ───

const VIEWS_BASE = API_BASE.replace(/\/api\/?$/, "/api/views");

export async function trackView(comic_slug: string, comic_title: string, comic_image: string, comic_type?: string): Promise<void> {
  try {
    await fetch(`${VIEWS_BASE}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comic_slug, comic_title, comic_image, comic_type }),
    });
  } catch { /* fire-and-forget */ }
}

export async function getViewCount(slug: string): Promise<{ view_count: number; weekly_views: number }> {
  try {
    const res = await fetch(`${VIEWS_BASE}/${slug}`);
    const data = await res.json();
    return data.data || { view_count: 0, weekly_views: 0 };
  } catch {
    return { view_count: 0, weekly_views: 0 };
  }
}

export async function getViewLeaderboard(type = "all", limit = 20): Promise<any[]> {
  try {
    const res = await fetch(`${VIEWS_BASE}/leaderboard?type=${type}&limit=${limit}`);
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export async function batchGetViews(slugs: string[]): Promise<Record<string, { view_count: number; weekly_views: number }>> {
  if (slugs.length === 0) return {};
  try {
    const res = await fetch(`${VIEWS_BASE}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: slugs.slice(0, 50) }),
    });
    const data = await res.json();
    const map: Record<string, { view_count: number; weekly_views: number }> = {};
    for (const item of (data.data || [])) {
      map[item.comic_slug] = { view_count: item.view_count, weekly_views: item.weekly_views };
    }
    return map;
  } catch {
    return {};
  }
}

// ─── Streak Sync ───

const AUTH_BASE = API_BASE.replace(/\/api\/?$/, "/api");

export async function syncStreak(current_streak: number, longest_streak: number, last_read_date: string): Promise<void> {
  const token = localStorage.getItem("kv_token");
  if (!token) return;
  // Don't sync if local history is empty — prevents wiping server streak
  const hasHistory = !!localStorage.getItem("komikverse_history");
  if (!hasHistory && current_streak === 0) return;
  try {
    await fetch(`${AUTH_BASE}/auth/sync-streak`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_streak, longest_streak, last_read_date }),
    });
  } catch { /* fire-and-forget */ }
}

export async function getStreakLeaderboard(limit = 20): Promise<any[]> {
  try {
    // Add cache-busting param to avoid stale Vercel edge cache
    const res = await fetch(`${AUTH_BASE}/auth/streak-leaderboard?limit=${limit}&_t=${Math.floor(Date.now() / 60000)}`);
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}
