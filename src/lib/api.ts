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
  { id: "komikapk", name: "KomikAPK", icon: "📱" },
] as const;

export function getProvider(): string {
  return currentProvider;
}

export function setProvider(provider: string) {
  currentProvider = provider;
  try { localStorage.setItem("comic-provider", provider); } catch {}
}

// In-memory response cache with TTL
interface CacheEntry {
  data: unknown;
  expires: number;
}

interface PersistentCacheEntry extends CacheEntry {
  staleUntil: number;
  updatedAt: number;
}

interface CachePolicy {
  ttl: number;
  staleTtl: number;
}

interface PersistentCacheIndexEntry {
  key: string;
  staleUntil: number;
  updatedAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const STALE_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const inflight = new Map<string, Promise<unknown>>();
const PERSISTENT_CACHE_PREFIX = "kv_api_cache_v2:";
const PERSISTENT_CACHE_INDEX_KEY = "kv_api_cache_index_v2";
const MAX_PERSISTENT_CACHE_ENTRIES = 60;
const MAX_PERSISTENT_CACHE_BYTES = 80_000;

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

function getPersistentStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readPersistentCacheIndex(): PersistentCacheIndexEntry[] {
  const storage = getPersistentStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(PERSISTENT_CACHE_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PersistentCacheIndexEntry => (
      !!entry
      && typeof entry.key === "string"
      && typeof entry.staleUntil === "number"
      && typeof entry.updatedAt === "number"
    ));
  } catch {
    return [];
  }
}

function writePersistentCacheIndex(entries: PersistentCacheIndexEntry[]) {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    storage.setItem(PERSISTENT_CACHE_INDEX_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage write failures.
  }
}

function removePersistentCache(key: string) {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${PERSISTENT_CACHE_PREFIX}${key}`);
    writePersistentCacheIndex(readPersistentCacheIndex().filter((entry) => entry.key !== key));
  } catch {
    // Ignore storage delete failures.
  }
}

function prunePersistentCache() {
  const storage = getPersistentStorage();
  if (!storage) return;

  const now = Date.now();
  const active = readPersistentCacheIndex()
    .filter((entry) => {
      if (entry.staleUntil <= now) {
        storage.removeItem(`${PERSISTENT_CACHE_PREFIX}${entry.key}`);
        return false;
      }
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  while (active.length > MAX_PERSISTENT_CACHE_ENTRIES) {
    const oldest = active.pop();
    if (oldest) storage.removeItem(`${PERSISTENT_CACHE_PREFIX}${oldest.key}`);
  }

  writePersistentCacheIndex(active);
}

function readPersistentCacheEntry(key: string): PersistentCacheEntry | null {
  const storage = getPersistentStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${PERSISTENT_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistentCacheEntry>;
    if (
      typeof parsed !== "object"
      || parsed === null
      || typeof parsed.expires !== "number"
      || typeof parsed.staleUntil !== "number"
      || typeof parsed.updatedAt !== "number"
      || !("data" in parsed)
    ) {
      removePersistentCache(key);
      return null;
    }
    if (parsed.staleUntil <= Date.now()) {
      removePersistentCache(key);
      return null;
    }
    return parsed as PersistentCacheEntry;
  } catch {
    removePersistentCache(key);
    return null;
  }
}

function getPersistentCached<T>(key: string, allowStale = false): { data: T; remainingTtl: number } | null {
  const entry = readPersistentCacheEntry(key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.expires > now) {
    return { data: entry.data as T, remainingTtl: entry.expires - now };
  }
  if (allowStale) {
    return { data: entry.data as T, remainingTtl: 0 };
  }
  return null;
}

function setPersistentCache(key: string, data: unknown, policy: CachePolicy) {
  const storage = getPersistentStorage();
  if (!storage) return;

  prunePersistentCache();

  const now = Date.now();
  const entry: PersistentCacheEntry = {
    data,
    expires: now + policy.ttl,
    staleUntil: now + policy.staleTtl,
    updatedAt: now,
  };

  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length > MAX_PERSISTENT_CACHE_BYTES) {
      removePersistentCache(key);
      return;
    }

    storage.setItem(`${PERSISTENT_CACHE_PREFIX}${key}`, serialized);
    const next = readPersistentCacheIndex().filter((item) => item.key !== key);
    next.unshift({ key, staleUntil: entry.staleUntil, updatedAt: entry.updatedAt });
    writePersistentCacheIndex(next);
    prunePersistentCache();
  } catch {
    // Ignore storage quota or serialization failures.
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
    provider: raw.provider,
  };
}

function buildUrl(endpoint: string, provider = currentProvider): string {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${API_BASE}${endpoint}${separator}provider=${provider}`;
}

const FETCH_TIMEOUT = 8000;
const SHINIGAMI_API_BASE = "https://api.shngm.io/v1";

function getRouteName(endpoint: string): string {
  return endpoint.replace(/^\//, "").split("?")[0].split("/")[0] || "";
}

function getEndpointSlug(endpoint: string): string {
  const parts = endpoint.replace(/^\//, "").split("?")[0].split("/").filter(Boolean);
  return parts[1] || "";
}

function getEndpointQuery(endpoint: string): URLSearchParams {
  const queryIndex = endpoint.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? endpoint.slice(queryIndex + 1) : "");
}

function getCachePolicy(endpoint: string): CachePolicy {
  switch (getRouteName(endpoint)) {
    case "genre":
      return { ttl: 10 * 60 * 1000, staleTtl: 24 * 60 * 60 * 1000 };
    case "recommended":
    case "popular":
    case "detail":
      return { ttl: 5 * 60 * 1000, staleTtl: 12 * 60 * 60 * 1000 };
    case "terbaru":
    case "search":
      return { ttl: 2 * 60 * 1000, staleTtl: 6 * 60 * 60 * 1000 };
    case "read":
      return { ttl: 10 * 60 * 1000, staleTtl: 24 * 60 * 60 * 1000 };
    default:
      return { ttl: CACHE_TTL, staleTtl: STALE_CACHE_TTL };
  }
}

function canUseDirectShinigami(endpoint: string): boolean {
  return ["terbaru", "popular", "recommended", "search", "genre", "read"].includes(getRouteName(endpoint));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getShinigamiTypeFromCountry(countryId: any): string {
  const normalized = String(countryId || "").toUpperCase();
  if (normalized === "KR") return "Manhwa";
  if (normalized === "CN") return "Manhua";
  return "Manga";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveShinigamiComicType(raw: any): string {
  const countryId = String(raw.country_id || "").toUpperCase();
  if (countryId === "KR") return "Manhwa";
  if (countryId === "CN") return "Manhua";
  if (countryId === "JP") return "Manga";

  const formatName = raw.taxonomy?.Format?.[0]?.name;
  if (typeof formatName === "string" && /^(Manhwa|Manhua|Manga)$/i.test(formatName)) {
    return formatName.charAt(0).toUpperCase() + formatName.slice(1).toLowerCase();
  }

  return countryId ? getShinigamiTypeFromCountry(countryId) : "Manga";
}

function getShinigamiStatusText(status: number): string {
  if (status === 1) return "Ongoing";
  if (status === 2) return "Completed";
  if (status === 3) return "Hiatus";
  return "Unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShinigamiComic(raw: any): Comic {
  return {
    title: raw.title || "",
    image: raw.cover_image_url || "",
    href: raw.manga_id ? `/manga/${raw.manga_id}` : "",
    type: resolveShinigamiComicType(raw),
    chapter: raw.latest_chapter_number ? `Chapter ${raw.latest_chapter_number}` : undefined,
    rating: raw.user_rate || undefined,
    description: raw.description,
    genre: raw.taxonomy?.Genre?.map((genre: { name: string }) => genre.name).join(", "),
    status: getShinigamiStatusText(raw.status),
    author: raw.taxonomy?.Author?.map((author: { name: string }) => author.name).join(", "),
    view_count: raw.view_count || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShinigamiGenres(raw: any[]): Genre[] {
  return raw.map((genre) => ({ title: genre.name, href: `/genre/${genre.slug}` }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShinigamiChapterData(raw: any): ChapterData {
  const baseUrl = raw.base_url || "https://assets.shngm.id";
  const path = raw.chapter?.path || "";
  return {
    title: raw.chapter_title || `Chapter ${raw.chapter_number || ""}`.trim(),
    panel: (raw.chapter?.data || []).map((file: string) => `${baseUrl}${path}${file}`),
  };
}

function transformShinigamiPagination(meta: { page?: number; total_page?: number } | undefined) {
  const currentPage = meta?.page || 1;
  const totalPage = meta?.total_page || 1;
  return {
    current_page: currentPage,
    length_page: totalPage,
    has_next: currentPage < totalPage,
    has_prev: currentPage > 1,
  };
}

async function fetchShinigamiJson(path: string, query?: URLSearchParams) {
  const requestUrl = `${SHINIGAMI_API_BASE}${path}${query && query.toString() ? `?${query.toString()}` : ""}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(requestUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Shinigami direct error: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchDirectShinigami<T>(endpoint: string): Promise<ApiResponse<T>> {
  const route = getRouteName(endpoint);
  const slug = getEndpointSlug(endpoint);
  const query = getEndpointQuery(endpoint);

  switch (route) {
    case "terbaru": {
      const result = await fetchShinigamiJson("/manga/list", new URLSearchParams({
        page: query.get("page") || "1",
        page_size: "20",
        sort: "latest",
        sort_order: "desc",
      }));
      if (result?.retcode !== 0) throw new Error("Failed to fetch latest from Shinigami");
      return {
        status: "success",
        data: (result.data || []).map(transformShinigamiComic) as T,
        ...transformShinigamiPagination(result.meta),
      };
    }

    case "popular": {
      const result = await fetchShinigamiJson("/manga/top", new URLSearchParams({ page: "1", page_size: "30" }));
      if (result?.retcode !== 0) throw new Error("Failed to fetch popular from Shinigami");
      return { status: "success", data: (result.data || []).map(transformShinigamiComic) as T };
    }

    case "recommended": {
      const result = await fetchShinigamiJson("/manga/list", new URLSearchParams({
        page: "1",
        page_size: "30",
        sort: "latest",
        sort_order: "desc",
        is_recommended: "true",
      }));
      if (result?.retcode !== 0) throw new Error("Failed to fetch recommendations from Shinigami");
      return { status: "success", data: (result.data || []).map(transformShinigamiComic) as T };
    }

    case "search": {
      const keyword = query.get("keyword") || "";
      if (!keyword) throw new Error("Parameter 'keyword' diperlukan");
      const result = await fetchShinigamiJson("/manga/list", new URLSearchParams({
        page: "1",
        page_size: "30",
        sort: "latest",
        sort_order: "desc",
        q: keyword,
      }));
      if (result?.retcode !== 0) throw new Error("Failed to search Shinigami");
      return { status: "success", data: (result.data || []).map(transformShinigamiComic) as T };
    }

    case "genre": {
      if (slug) {
        const result = await fetchShinigamiJson("/manga/list", new URLSearchParams({
          page: query.get("page") || "1",
          page_size: "20",
          sort: "latest",
          sort_order: "desc",
          genre: slug,
        }));
        if (result?.retcode !== 0) throw new Error("Failed to fetch Shinigami genre comics");
        return {
          status: "success",
          data: (result.data || []).map(transformShinigamiComic) as T,
          ...transformShinigamiPagination(result.meta),
        };
      }

      const result = await fetchShinigamiJson("/genre/list");
      if (result?.retcode !== 0) throw new Error("Failed to fetch Shinigami genres");
      return { status: "success", data: transformShinigamiGenres(result.data || []) as T };
    }

    case "read": {
      if (!slug) throw new Error("Slug required");
      const result = await fetchShinigamiJson(`/chapter/detail/${encodeURIComponent(slug)}`);
      if (result?.retcode !== 0) throw new Error("Failed to fetch Shinigami chapter");
      return { status: "success", data: [transformShinigamiChapterData(result.data)] as T };
    }

    default:
      throw new Error(`Unsupported direct Shinigami route: ${route}`);
  }
}

async function fetchApiNetwork<T>(endpoint: string, provider: string): Promise<ApiResponse<T>> {
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
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchShinigamiWithFallback<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    return await fetchDirectShinigami<T>(endpoint);
  } catch {
    return fetchApiNetwork<T>(endpoint, "shinigami");
  }
}

async function fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApiWithProvider<T>(endpoint, currentProvider);
}

async function fetchApiWithProvider<T>(endpoint: string, provider: string): Promise<ApiResponse<T>> {
  const cacheKey = `${endpoint}|${provider}`;
  const cached = getCached<ApiResponse<T>>(cacheKey);
  if (cached) return cached;

  const persisted = getPersistentCached<ApiResponse<T>>(cacheKey);
  if (persisted) {
    setCache(cacheKey, persisted.data, persisted.remainingTtl || getCachePolicy(endpoint).ttl);
    return persisted.data;
  }

  if (inflight.has(cacheKey)) return inflight.get(cacheKey) as Promise<ApiResponse<T>>;

  const promise = (async () => {
    const policy = getCachePolicy(endpoint);
    const stale = getPersistentCached<ApiResponse<T>>(cacheKey, true)?.data;

    try {
      const data = provider === "shinigami" && canUseDirectShinigami(endpoint)
        ? await fetchShinigamiWithFallback<T>(endpoint)
        : await fetchApiNetwork<T>(endpoint, provider);
      setCache(cacheKey, data, policy.ttl);
      setPersistentCache(cacheKey, data, policy);
      return data;
    } catch (error) {
      if (stale) {
        setCache(cacheKey, stale, 30 * 1000);
        return stale;
      }
      throw error;
    } finally {
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

// All homepage/listing functions fetch from all 3 providers in parallel and merge
export async function getLatest(page = 1): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders(`/terbaru?page=${page}`);
  return { status: "Ok", data };
}

export async function getPopular(): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders("/popular");
  return { status: "Ok", data };
}

export async function getRecommended(): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders("/recommended");
  return { status: "Ok", data };
}

export async function getAllPopular(): Promise<Comic[]> {
  return fetchAllProviders("/popular");
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

export async function getChapterImages(slug: string, chapterProvider?: string): Promise<ApiResponse<ChapterData[]>> {
  // Use chapter's tagged provider first, then currentProvider, then try others
  const primary = chapterProvider || currentProvider;
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
  // Merge genres from all providers, deduplicate by normalized title
  const results = await Promise.allSettled(
    PROVIDERS.map(async (p) => {
      try {
        const res = await fetchApiWithProvider<Genre[]>("/genre", p.id);
        return res.data || [];
      } catch { return []; }
    })
  );
  const all: Genre[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const g of r.value) {
        const key = g.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seen.has(key)) { seen.add(key); all.push(g); }
      }
    }
  }
  return { status: "Ok", data: all };
}

export async function getComicsByGenre(slug: string, page = 1): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders(`/genre/${slug}?page=${page}`);
  return { status: "Ok", data };
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
