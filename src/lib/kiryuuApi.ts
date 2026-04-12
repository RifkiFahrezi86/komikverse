/**
 * Direct WP REST API client for Kiryuu provider.
 * Bypasses backend (Cloudflare blocks Vercel IPs) by calling v3.kiryuu.to directly from the browser.
 * CORS is allowed (Access-Control-Allow-Origin: *).
 */
import type { ApiResponse, Comic, ComicDetail, Chapter, ChapterData, Genre } from "./api";

const WP_API = "https://v3.kiryuu.to/wp-json/wp/v2";
const KIRYUU_BASE = "https://v3.kiryuu.to";

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#8211;/g, "–").replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\u201C").replace(/&#8221;/g, "\u201D")
    .replace(/&#038;/g, "&").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() || "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMangaToComic(m: any): Comic {
  const thumb = m._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";
  let type = "Manga";
  const terms = m._embedded?.["wp:term"] || [];
  for (const group of terms) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const term of (group as any[])) {
      if (term.taxonomy === "type" && term.name && term.name !== "-") type = term.name;
    }
  }
  return {
    title: decodeHtmlEntities(m.title?.rendered || ""),
    image: thumb,
    href: `/manga/${m.slug}`,
    type,
  };
}

async function fetchMangaList(params: string): Promise<ApiResponse<Comic[]>> {
  const res = await fetch(`${WP_API}/manga?${params}&_embed=wp:term,wp:featuredmedia`);
  if (!res.ok) throw new Error(`WP API ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1");
  const page = parseInt(new URLSearchParams(params).get("page") || "1");
  return {
    status: "Ok",
    data: data.map(mapMangaToComic),
    current_page: page,
    length_page: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}

async function fetchDetail(slug: string): Promise<ApiResponse<ComicDetail>> {
  const res = await fetch(`${WP_API}/manga?slug=${encodeURIComponent(slug)}&_embed=wp:term,wp:featuredmedia`);
  if (!res.ok) throw new Error(`WP API ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  if (!data.length) throw new Error("Not found");
  const manga = data[0];

  const title = decodeHtmlEntities(manga.title?.rendered || "");
  const thumbnail = manga._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";
  const description = stripHtml(manga.excerpt?.rendered || manga.content?.rendered || "");

  let type = "Manga", status = "Unknown";
  const genres: Array<{ title: string; href: string }> = [];
  let author = "", artist = "";
  const terms = manga._embedded?.["wp:term"] || [];
  for (const group of terms) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const term of (group as any[])) {
      if (term.taxonomy === "type" && term.name && term.name !== "-") type = term.name;
      if (term.taxonomy === "status" || term.taxonomy === "manga-status") status = term.name || "Unknown";
      if (term.taxonomy === "genre") genres.push({ title: term.name, href: `/genre/${term.slug}` });
      if (term.taxonomy === "series-author") author = term.name || "";
      if (term.taxonomy === "artist") artist = term.name || "";
    }
  }

  // Fetch chapters via admin-ajax (browser isn't blocked by Cloudflare)
  const chapters = await fetchChapters(manga.id, slug);

  return {
    status: "Ok",
    data: { title, image: thumbnail, description, type, status, author, artist, genre: genres, chapters, released: "" },
  };
}

async function fetchChapters(mangaId: number, mangaSlug: string): Promise<Chapter[]> {
  try {
    const res = await fetch(`${KIRYUU_BASE}/wp-admin/admin-ajax.php?manga_id=${mangaId}&page=1&action=chapter_list`);
    if (!res.ok) return [];
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const chapters: Chapter[] = [];
    doc.querySelectorAll("div[data-chapter-number]").forEach((el) => {
      const chNum = el.getAttribute("data-chapter-number") || "";
      const link = el.querySelector("a");
      const href = link?.getAttribute("href") || "";
      const titleEl = el.querySelector("span");
      const title = titleEl?.textContent?.trim() || `Chapter ${chNum}`;
      const time = el.querySelector("time");
      const date = time?.getAttribute("datetime") || "";
      if (!href) return;
      const path = href.replace(/https?:\/\/v[0-9]+\.kiryuu\.to\/manga\//, "").replace(/\/$/, "");
      const parts = path.split("/");
      if (parts.length < 2) return;
      const encoded = `${parts[0]}--${parts.slice(1).join("/")}`;
      chapters.push({ title, href: `/chapter/${encoded}`, date: date || undefined, number: chNum ? parseFloat(chNum) : undefined });
    });
    return chapters;
  } catch {
    // Fallback: try WP REST API chapter search
    try {
      const res = await fetch(`${WP_API}/chapter?search=${encodeURIComponent(mangaSlug)}&per_page=100&orderby=date&order=desc&_fields=slug,title,date`);
      if (!res.ok) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await res.json();
      return data
        .filter((ch) => ch.slug.startsWith(mangaSlug + "-chapter"))
        .map((ch) => {
          const numMatch = ch.slug.match(/chapter-(\d+(?:-\d+)?)/);
          const num = numMatch ? parseFloat(numMatch[1].replace("-", ".")) : undefined;
          return {
            title: decodeHtmlEntities(ch.title?.rendered || ""),
            href: `/chapter/${mangaSlug}--${ch.slug.replace(mangaSlug + "-", "")}`,
            date: ch.date,
            number: num,
          };
        });
    } catch {
      return [];
    }
  }
}

async function fetchRead(slug: string): Promise<ApiResponse<ChapterData[]>> {
  // slug format: "manga-slug--chapter-part" (e.g., "juvenile-prison--chapter-91")
  const sepIdx = slug.indexOf("--");
  if (sepIdx === -1) throw new Error("Invalid chapter slug");
  const mangaSlug = slug.substring(0, sepIdx);
  const chapterPart = slug.substring(sepIdx + 2);
  // WP REST API chapter slug: manga-slug-chapter-part (replace -- with -)
  const wpSlug = `${mangaSlug}-${chapterPart.replace(/\//g, "-")}`;

  const res = await fetch(`${WP_API}/chapter?slug=${encodeURIComponent(wpSlug)}&_fields=title,content`);
  if (!res.ok) throw new Error(`WP API ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  if (!data.length) throw new Error("Chapter not found");

  const chapter = data[0];
  const content = chapter.content?.rendered || "";
  const doc = new DOMParser().parseFromString(content, "text/html");
  const images: string[] = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    if (src && !src.includes("icon") && !src.includes("logo") && !src.includes("svg") && !src.includes("avatar")) {
      images.push(src.trim());
    }
  });

  return {
    status: "Ok",
    data: [{ title: decodeHtmlEntities(chapter.title?.rendered || ""), panel: images }],
  };
}

async function fetchGenres(): Promise<ApiResponse<Genre[]>> {
  const res = await fetch(`${WP_API}/genre?per_page=100&_fields=slug,name,count&orderby=count&order=desc`);
  if (!res.ok) throw new Error(`WP API ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  return {
    status: "Ok",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data.filter((g: any) => g.count > 0).map((g: any) => ({ title: g.name, href: `/genre/${g.slug}` })),
  };
}

async function fetchGenreComics(genreSlug: string, page: number): Promise<ApiResponse<Comic[]>> {
  // First get genre ID by slug
  const gRes = await fetch(`${WP_API}/genre?slug=${encodeURIComponent(genreSlug)}&_fields=id`);
  if (!gRes.ok) throw new Error(`WP API ${gRes.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gData: any[] = await gRes.json();
  if (!gData.length) throw new Error("Genre not found");
  return fetchMangaList(`genre=${gData[0].id}&per_page=20&page=${page}`);
}

/**
 * Route an API endpoint to the appropriate WP REST API call.
 * Returns null if the endpoint is not supported.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function kiryuuDirectFetch<T>(endpoint: string): Promise<ApiResponse<T> | null> {
  const url = new URL(endpoint, "http://d");
  const parts = url.pathname.split("/").filter(Boolean);
  const route = parts[0];
  const slug = parts.slice(1).join("/");
  const params = url.searchParams;

  switch (route) {
    case "terbaru":
      return (await fetchMangaList(`per_page=30&page=${params.get("page") || 1}&orderby=modified&order=desc`)) as unknown as ApiResponse<T>;
    case "popular":
      return (await fetchMangaList("per_page=30&orderby=modified&order=desc")) as unknown as ApiResponse<T>;
    case "recommended":
      return (await fetchMangaList("per_page=30&orderby=date&order=desc")) as unknown as ApiResponse<T>;
    case "search": {
      const kw = params.get("keyword");
      if (!kw) return null;
      return (await fetchMangaList(`search=${encodeURIComponent(kw)}&per_page=20&orderby=relevance`)) as unknown as ApiResponse<T>;
    }
    case "detail":
      if (slug) return (await fetchDetail(slug)) as unknown as ApiResponse<T>;
      return null;
    case "read":
      if (slug) return (await fetchRead(slug)) as unknown as ApiResponse<T>;
      return null;
    case "genre":
      if (slug) return (await fetchGenreComics(slug, parseInt(params.get("page") || "1"))) as unknown as ApiResponse<T>;
      return (await fetchGenres()) as unknown as ApiResponse<T>;
    default:
      return null;
  }
}
