const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9hcGktbWFuZ2EtZml2ZS52ZXJjZWwuYXBw");
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

export async function getLatest(page = 1): Promise<ApiResponse<Comic[]>> {
  const res = await fetchApi<Comic[]>(`/terbaru?page=${page}`);
  res.data = (res.data || []).map(normalizeComic);
  return res;
}

export async function getPopular(): Promise<ApiResponse<Comic[]>> {
  const res = await fetchApi<Comic[]>("/popular");
  res.data = (res.data || []).map(normalizeComic);
  return res;
}

export async function getRecommended(): Promise<ApiResponse<Comic[]>> {
  const res = await fetchApi<Comic[]>("/recommended");
  res.data = (res.data || []).map(normalizeComic);
  return res;
}

export async function searchComics(keyword: string): Promise<ApiResponse<Comic[]>> {
  const res = await fetchApi<Comic[]>(`/search?keyword=${encodeURIComponent(keyword)}`);
  res.data = (res.data || []).map(normalizeComic);
  return res;
}

export async function getComicDetail(slug: string): Promise<ApiResponse<ComicDetail>> {
  const res = await fetchApi<ComicDetail>(`/detail/${slug}`);
  if (res.data) res.data = normalizeDetail(res.data);
  return res;
}

export async function getChapterImages(slug: string): Promise<ApiResponse<ChapterData[]>> {
  return fetchApi(`/read/${slug}`);
}

export async function getGenres(): Promise<ApiResponse<Genre[]>> {
  return fetchApi("/genre");
}

export async function getComicsByGenre(slug: string, page = 1): Promise<ApiResponse<Comic[]>> {
  const res = await fetchApi<Comic[]>(`/genre/${slug}?page=${page}`);
  res.data = (res.data || []).map(normalizeComic);
  return res;
}
