# Panduan Membuat API Komik Sendiri

## Kenapa Buat API Sendiri?
- **Tidak ada rate limit** — bebas request sepuasnya
- **Tidak tergantung** API orang lain yang bisa down/hilang kapan saja
- **Kontrol penuh** — bisa tambah fitur, ubah provider, dll
- **Lebih cepat** — bisa optimize sesuai kebutuhan website kamu

---

## Arsitektur Sederhana

```
[Website Kamu (Frontend)]
        │
        ▼
[API Kamu (Backend)] ──scrape──▶ [Sumber Komik: shinigami.asia, dll]
        │
        ▼
[Cache/Database] ──simpan data agar tidak scrape terus-terusan
```

---

## Langkah-Langkah

### 1. Pilih Teknologi Backend

| Teknologi | Bahasa | Kelebihan |
|-----------|--------|-----------|
| **Express.js** | JavaScript/Node.js | Paling mudah, kamu sudah pakai JS |
| **Hono** | JavaScript/Node.js | Ringan, cepat, cocok untuk Vercel/Cloudflare |
| **FastAPI** | Python | Mudah, auto-dokumentasi |

**Rekomendasi:** Pakai **Express.js** atau **Hono** karena kamu sudah familiar dengan JavaScript.

---

### 2. Cara Kerja API Komik

API komik pada dasarnya adalah **web scraper** — mengambil data dari website komik, lalu mengembalikannya dalam format JSON.

```
User request: GET /api/popular

API kamu melakukan:
1. Fetch halaman dari https://shinigami.asia (atau sumber lain)
2. Parse HTML-nya (ambil judul, gambar, link, dll)
3. Format jadi JSON
4. Kirim ke user
```

---

### 3. Struktur Project

```
komik-api/
├── src/
│   ├── index.ts          # Entry point, setup server
│   ├── routes/
│   │   ├── popular.ts    # GET /popular
│   │   ├── latest.ts     # GET /terbaru
│   │   ├── search.ts     # GET /search?keyword=xxx
│   │   ├── detail.ts     # GET /detail?slug=xxx
│   │   └── chapter.ts    # GET /chapter?slug=xxx
│   ├── scrapers/
│   │   ├── shinigami.ts  # Scraper untuk shinigami.asia
│   │   └── komikcast.ts  # Scraper untuk komikcast (opsional)
│   └── cache.ts          # Simple in-memory cache
├── package.json
├── tsconfig.json
└── vercel.json           # Jika deploy ke Vercel
```

---

### 4. Contoh Kode Dasar (Express.js + TypeScript)

#### a. Setup Project

```bash
mkdir komik-api
cd komik-api
npm init -y
npm install express axios cheerio
npm install -D typescript @types/express @types/node tsx
npx tsc --init
```

- **express** — web server
- **axios** — untuk fetch halaman website komik
- **cheerio** — untuk parse HTML (seperti jQuery tapi di server)

#### b. Entry Point (`src/index.ts`)

```typescript
import express from "express";
import cors from "cors";
import { getPopular } from "./scrapers/shinigami";

const app = express();
app.use(cors()); // Izinkan frontend akses API

// Endpoint: Komik Populer
app.get("/popular", async (req, res) => {
  try {
    const data = await getPopular();
    res.json({ status: "success", data });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Gagal mengambil data" });
  }
});

// Endpoint: Pencarian
app.get("/search", async (req, res) => {
  const keyword = req.query.keyword as string;
  if (!keyword) {
    return res.status(400).json({ status: "error", message: "Keyword diperlukan" });
  }
  try {
    const data = await searchComics(keyword);
    res.json({ status: "success", data });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Gagal mencari" });
  }
});

app.listen(3001, () => {
  console.log("API berjalan di http://localhost:3001");
});
```

#### c. Scraper (`src/scrapers/shinigami.ts`)

```typescript
import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://08.shinigami.asia";

export async function getPopular() {
  // Fetch halaman dari website shinigami
  const { data: html } = await axios.get(`${BASE_URL}/popular`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
    },
  });

  // Parse HTML
  const $ = cheerio.load(html);
  const comics: any[] = [];

  // Sesuaikan selector dengan struktur HTML website target
  $(".comic-item").each((_, el) => {
    comics.push({
      title: $(el).find(".title").text().trim(),
      href: $(el).find("a").attr("href") || "",
      thumbnail: $(el).find("img").attr("src") || "",
      type: $(el).find(".type").text().trim(),
      chapter: $(el).find(".chapter").text().trim(),
    });
  });

  return comics;
}
```

> **PENTING:** Selector CSS (`.comic-item`, `.title`, dll) harus disesuaikan dengan
> struktur HTML website yang kamu scrape. Buka website-nya, klik kanan → Inspect
> untuk melihat struktur HTML-nya.

---

### 5. Tambahkan Cache (Agar Tidak Scrape Terus)

```typescript
// src/cache.ts
interface CacheEntry {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

export function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: any, ttlMinutes = 10): void {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlMinutes * 60 * 1000,
  });
}
```

Gunakan di route:

```typescript
app.get("/popular", async (req, res) => {
  // Cek cache dulu
  const cached = getCache("popular");
  if (cached) {
    return res.json({ status: "success", data: cached });
  }

  // Kalau tidak ada di cache, scrape
  const data = await getPopular();
  setCache("popular", data, 10); // Cache 10 menit
  res.json({ status: "success", data });
});
```

**Dengan cache 10 menit:**
- 100 user buka halaman popular dalam 10 menit = **1 kali scrape** (bukan 100 kali)
- Website sumber tidak terbebani
- Response lebih cepat

---

### 6. Deploy (Gratis)

#### Opsi A: Vercel (Paling Mudah)

1. Buat `vercel.json`:
```json
{
  "builds": [{ "src": "src/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/index.ts" }]
}
```

2. Deploy:
```bash
npm install -g vercel
vercel
```

**Limit Vercel free:** 100GB bandwidth/bulan, function timeout 10 detik.

#### Opsi B: Railway.app

1. Push ke GitHub
2. Buka [railway.app](https://railway.app)
3. Connect repo → otomatis deploy

**Limit Railway free:** $5 credit/bulan (cukup untuk project kecil).

#### Opsi C: Render.com

1. Push ke GitHub
2. Buka [render.com](https://render.com)
3. New → Web Service → connect repo

**Limit Render free:** 750 jam/bulan, auto-sleep setelah 15 menit idle.

---

### 7. Hubungkan ke Website Kamu

Setelah API di-deploy (misalnya `https://komik-api-kamu.vercel.app`):

```env
# .env.local
VITE_API_BASE=https://komik-api-kamu.vercel.app
```

Kode frontend **tidak perlu diubah** — tinggal ganti URL API-nya saja.

---

## Ringkasan Langkah

```
1. Buat project Node.js + Express
2. Tulis scraper (axios + cheerio) untuk ambil data dari website komik
3. Buat endpoint: /popular, /terbaru, /search, /detail, /chapter
4. Tambahkan cache agar tidak scrape berlebihan
5. Deploy ke Vercel/Railway/Render
6. Ganti VITE_API_BASE di .env.local ke URL API kamu
7. Selesai! Tidak ada rate limit lagi ✅
```

---

## Tips Penting

- **Jangan spam website sumber** — gunakan cache minimal 5-10 menit
- **Gunakan User-Agent** yang wajar saat scraping
- **Handle error** — website sumber bisa berubah struktur HTML-nya kapan saja
- **Backup provider** — siapkan scraper untuk 2-3 website komik berbeda
- Baca **robots.txt** website target untuk tahu halaman yang boleh di-scrape
