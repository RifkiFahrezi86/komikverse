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

// Generate HMAC token for API authentication
async function generateAuthHeaders(): Promise<Record<string, string>> {
  if (!API_SECRET) return {};
  const timestamp = String(Date.now());
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(API_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp));
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

async function fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const authHeaders = await generateAuthHeaders();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...authHeaders },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchApiWithProvider<T>(endpoint: string, provider: string): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, provider);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const authHeaders = await generateAuthHeaders();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...authHeaders },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
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

export async function searchComics(keyword: string): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders(`/search?keyword=${encodeURIComponent(keyword)}`);
  return { status: "Ok", data };
}

export async function searchAllProviders(keyword: string): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders(`/search?keyword=${encodeURIComponent(keyword)}`);
  return { status: "Ok", data };
}

export async function getComicDetail(slug: string): Promise<ApiResponse<ComicDetail>> {
  // Try all providers, prefer one with the most chapters
  const providerOrder = [currentProvider, ...PROVIDERS.map(p => p.id).filter(id => id !== currentProvider)];
  let bestResult: ApiResponse<ComicDetail> | null = null;
  let bestProvider = "";
  for (const pid of providerOrder) {
    try {
      const res = await fetchApiWithProvider<ComicDetail>(`/detail/${slug}`, pid);
      if (res.data) {
        res.data = normalizeDetail(res.data);
        const chapters = res.data.chapters?.length || 0;
        const bestChapters = bestResult?.data?.chapters?.length || 0;
        if (!bestResult || chapters > bestChapters) {
          bestResult = res;
          bestProvider = pid;
        }
        // If we found chapters, no need to try more providers
        if (chapters > 0) break;
      }
    } catch { /* try next */ }
  }
  if (bestResult) {
    if (bestProvider) setProvider(bestProvider);
    return bestResult;
  }
  throw new Error("Comic not found in any provider");
}

export async function getChapterImages(slug: string): Promise<ApiResponse<ChapterData[]>> {
  // Try current provider first, then fallback to others
  const providerOrder = [currentProvider, ...PROVIDERS.map(p => p.id).filter(id => id !== currentProvider)];
  for (const pid of providerOrder) {
    try {
      const res = await fetchApiWithProvider<ChapterData[]>(`/read/${slug}`, pid);
      if (res.data && res.data.length > 0) return res;
    } catch { /* try next */ }
  }
  throw new Error("Chapter not found in any provider");
}

export async function getGenres(): Promise<ApiResponse<Genre[]>> {
  // Merge genres from all providers
  const results = await Promise.allSettled(
    PROVIDERS.map(async (p) => {
      try {
        const res = await fetchApiWithProvider<Genre[]>("/genre", p.id);
        return res.data || [];
      } catch {
        return [];
      }
    })
  );
  const seen = new Set<string>();
  const merged: Genre[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const g of result.value) {
        const key = g.title.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(g);
        }
      }
    }
  }
  merged.sort((a, b) => a.title.localeCompare(b.title));
  return { status: "Ok", data: merged };
}

export async function getComicsByGenre(slug: string, page = 1): Promise<ApiResponse<Comic[]>> {
  const data = await fetchAllProviders(`/genre/${slug}?page=${page}`);
  return { status: "Ok", data };
}
