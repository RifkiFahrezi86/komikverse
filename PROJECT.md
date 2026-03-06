# Project Plan: KomikVerse

## Overview

Membangun **website baca komik lengkap** dengan 2 project terpisah:

| # | Project | Teknologi | Status | Lokasi |
|---|---------|-----------|--------|--------|
| 1 | **KOMIK** (Frontend) | Vite + React + TypeScript + Tailwind | ✅ Selesai | `D:\WEB PROJECT\PROJECT\KOMIK` |
| 2 | **KOMIK-API** (Backend) | Express/Hono + Cheerio + TypeScript | ❌ Belum | `D:\WEB PROJECT\PROJECT\KOMIK-API` |

---

## Project 1: KOMIK (Frontend) ✅

Website baca komik yang sudah selesai dibuat.

### Teknologi
- **Vite 6.4.1** + React 19 + TypeScript
- **Tailwind CSS 3** + custom theme (orange brand `#f97316`)
- **React Router v7** (createBrowserRouter)
- **Lucide React** (icons)
- **Fonts:** Bangers (display) + Nunito (body)

### Halaman
| Halaman | File | Fungsi |
|---------|------|--------|
| Home | `HomePage.tsx` | Komik dipisah per type (Manhwa/Manga/Manhua) |
| Terbaru | `LatestPage.tsx` | Daftar komik terbaru + pagination |
| Genre | `GenrePage.tsx` | 25 genre dengan kartu gradient |
| Genre Detail | `GenreDetailPage.tsx` | Filter komik per genre + filter type |
| Type | `TypePage.tsx` | Komik per type dengan hero header |
| Detail Komik | `ComicDetailPage.tsx` | Info komik + daftar chapter + bookmark |
| Baca Komik | `ReaderPage.tsx` | Reader long-strip/single + auto-hide nav |
| Pencarian | `SearchPage.tsx` | Search + filter type (Semua/Manhwa/Manga/Manhua) |
| Bookmark | `BookmarkPage.tsx` | Bookmark lokal (localStorage) |

### Fitur Utama
- 🔍 **Pencarian** dengan filter type (Semua/Manhwa/Manga/Manhua)
- 📖 **Reader mode:** long-strip & single page
- 🔖 **Bookmark** (localStorage)
- 📱 **Responsive** (mobile + desktop)
- ⬅️➡️ **Navigasi chapter** (prev/next) — auto-hide saat baca
- 🔄 **Image retry** (3x retry + cache-bust sebelum "No Image")
- 🔒 **API URL** di environment variable (.env.local)
- 🏷️ **Type badge** pada thumbnail komik (Manhwa/Manga/Manhua)
- 📊 **Filter type** di halaman search dan genre detail

### Struktur Folder
```
KOMIK/
├── public/
├── src/
│   ├── components/
│   │   ├── ComicCard.tsx        # Kartu komik (retry logic, type badge)
│   │   ├── Navbar.tsx           # Navigasi utama + search
│   │   ├── Footer.tsx           # Footer
│   │   └── ScrollToTop.tsx      # Reset scroll position
│   ├── lib/
│   │   └── api.ts               # API client (fetchApi + semua fungsi)
│   ├── pages/
│   │   ├── HomePage.tsx         # Home (komik dipisah per type)
│   │   ├── LatestPage.tsx       # Komik terbaru + pagination
│   │   ├── GenrePage.tsx        # 25 genre cards
│   │   ├── GenreDetailPage.tsx  # Komik per genre + filter type
│   │   ├── TypePage.tsx         # Komik per type + hero header
│   │   ├── ComicDetailPage.tsx  # Detail komik + daftar chapter
│   │   ├── ReaderPage.tsx       # Reader + auto-hide nav
│   │   ├── SearchPage.tsx       # Search + filter type
│   │   └── BookmarkPage.tsx     # Bookmark (localStorage)
│   ├── css/
│   │   ├── theme.css            # Custom theme styles
│   │   └── fonts.css            # Font imports (Bangers, Nunito)
│   ├── App.tsx                  # Router setup
│   └── main.tsx                 # Entry point
├── .env.local                   # API base URL + provider
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── PANDUAN-API-SENDIRI.md       # Tutorial lengkap buat API sendiri
└── PROJECT.md                   # File ini
```

### API yang Dipakai (Saat Ini)
```env
# .env.local
VITE_API_BASE=https://api-manga-five.vercel.app
VITE_API_PROVIDER=shinigami
```

| Endpoint | Fungsi | Dipakai di |
|----------|--------|-----------|
| `GET /popular?provider=shinigami` | Komik populer | HomePage, TypePage |
| `GET /terbaru?page=1&provider=shinigami` | Komik terbaru | LatestPage, HomePage |
| `GET /rekomendasi?provider=shinigami` | Komik rekomendasi | HomePage, TypePage |
| `GET /search?keyword=xxx&provider=shinigami` | Cari komik | SearchPage |
| `GET /detail?slug=xxx&provider=shinigami` | Detail + chapter list | ComicDetailPage |
| `GET /chapter?slug=xxx&provider=shinigami` | Gambar chapter | ReaderPage |

> ⚠️ API ini **bukan milik sendiri** — ada rate limit 70 req/min dan bisa down kapan saja.

### Yang Perlu Diganti Nanti
Setelah KOMIK-API selesai, ganti di `.env.local`:
```env
VITE_API_BASE=https://komik-api-kamu.vercel.app
```
Kode frontend **tidak perlu diubah** — tinggal ganti URL API saja.

---

## Project 2: KOMIK-API (Backend) ❌ Belum Dibuat

API scraper sendiri yang mengambil data komik dari website sumber.

> 📖 Tutorial lengkap ada di file **PANDUAN-API-SENDIRI.md**

### Teknologi
- **Express.js** atau **Hono** — web server
- **Axios** — fetch halaman HTML dari situs komik
- **Cheerio** — parse HTML (ambil judul, gambar, link, dll)
- **TypeScript** — type safety
- **Node.js** — runtime

### Sumber Komik (Target Scraping)
| Sumber | URL | Konten |
|--------|-----|--------|
| **Shinigami** | `08.shinigami.asia` | Manhwa, Manga, Manhua |
| Komikcast | `komikcast03.com` | Manga (backup) |
| Aqua Reader | `aquareader.net` | Manhwa (backup) |

### Endpoint yang Harus Dibuat
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/popular?provider=xxx` | Komik populer |
| GET | `/terbaru?page=1&provider=xxx` | Komik terbaru + pagination |
| GET | `/rekomendasi?provider=xxx` | Komik rekomendasi |
| GET | `/search?keyword=xxx&provider=xxx` | Cari komik |
| GET | `/detail?slug=xxx&provider=xxx` | Detail + daftar chapter |
| GET | `/chapter?slug=xxx&provider=xxx` | Gambar chapter |

### Format Response
```json
{
  "status": "success",
  "data": [ ... ]
}
```

### Struktur Folder
```
KOMIK-API/
├── src/
│   ├── index.ts              # Entry point, setup server + CORS
│   ├── routes/
│   │   ├── popular.ts        # GET /popular
│   │   ├── latest.ts         # GET /terbaru
│   │   ├── recommended.ts    # GET /rekomendasi
│   │   ├── search.ts         # GET /search
│   │   ├── detail.ts         # GET /detail
│   │   └── chapter.ts        # GET /chapter
│   ├── scrapers/
│   │   ├── shinigami.ts      # Scraper untuk shinigami.asia
│   │   └── komikcast.ts      # Scraper untuk komikcast (opsional)
│   └── cache.ts              # In-memory cache (TTL 5-10 menit)
├── package.json
├── tsconfig.json
├── vercel.json               # Deploy config
└── .gitignore
```

### Cache Strategy
| Endpoint | TTL Cache | Alasan |
|----------|-----------|--------|
| /popular | 15 menit | Data jarang berubah |
| /terbaru | 5 menit | Update cukup sering |
| /rekomendasi | 15 menit | Data jarang berubah |
| /search | 10 menit | Per keyword |
| /detail | 30 menit | Data komik stabil |
| /chapter | 60 menit | Gambar chapter tidak berubah |

### Deploy (Gratis)
| Platform | Limit | Cocok? |
|----------|-------|--------|
| **Vercel** | 100GB bandwidth, 10s timeout | ✅ Paling mudah |
| **Railway** | $5 credit/bulan | ✅ Bagus |
| **Render** | 750 jam/bulan, auto-sleep | ⚠️ OK tapi lambat bangun |

---

## Urutan Pengerjaan

```
[1] ✅ KOMIK (Frontend) — SELESAI
         │
[2] ❌ KOMIK-API (Backend) — BELUM
         │
         ├── Buat project + setup Express/Hono
         ├── Tulis scraper shinigami.ts
         ├── Buat semua 6 endpoint
         ├── Tambahkan cache
         ├── Test lokal (localhost:3001)
         ├── Deploy ke Vercel/Railway
         │
[3] ❌ Hubungkan — BELUM
         │
         └── Ganti VITE_API_BASE di KOMIK/.env.local
             ke URL API sendiri
```

---

## Catatan Penting

- ⚠️ **crossOrigin="anonymous"** JANGAN ditambahkan ke `<img>` — bakal merusak semua gambar
- 🖼️ Image dari `assets.shngm.id` — pakai retry logic jika gagal load
- 📦 Chapter array dari API **descending** (254, 253, ... 1) — prev/next sudah di-handle
- 🔒 API URL disimpan di `.env.local` (tidak di-commit ke Git)
- 📱 Reader nav auto-hide saat scroll, tap untuk toggle

---

## Author

**Rifki Nur Fahrezi Ahmad** — [RifkiFahrezi86](https://github.com/RifkiFahrezi86)
