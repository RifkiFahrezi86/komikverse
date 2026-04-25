import { getComicDetail, type Chapter } from "./api";

export interface ReaderNavigationState {
  chapters?: Chapter[];
  comicSlug?: string;
  comicTitle?: string;
  comicImage?: string;
  comicType?: string;
  genres?: string[];
}

interface ReaderBaseData {
  comicSlug: string;
  comicTitle: string;
  comicImage: string;
  comicType?: string;
}

function normalizeGenres(genre: unknown): string[] {
  if (!Array.isArray(genre)) return [];
  return genre.map((item) => (typeof item === "string" ? item : item?.title)).filter(Boolean);
}

export async function buildReaderState(base: ReaderBaseData): Promise<ReaderNavigationState> {
  try {
    const res = await getComicDetail(base.comicSlug);
    const comic = res.data;
    if (!comic) {
      return { ...base, chapters: [] };
    }

    return {
      chapters: comic.chapters || [],
      comicSlug: base.comicSlug,
      comicTitle: comic.title || base.comicTitle,
      comicImage: comic.image || base.comicImage,
      comicType: comic.type || base.comicType,
      genres: normalizeGenres(comic.genre),
    };
  } catch {
    return { ...base, chapters: [] };
  }
}