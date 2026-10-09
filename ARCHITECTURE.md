# Architecture & Developer Guide - Streamverse 2

Welcome to the **Streamverse 2** codebase. This guide is designed to help any engineer immediately understand the architecture, data flow, streaming pipeline, and coding conventions without having to reverse-engineer individual files.

---

## 1. High-Level Architecture Overview

Streamverse 2 is a single-page media streaming and discovery application built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**.

### Key Architectural Pillars:
1. **Decoupled Discovery & Streaming Layers**: Media browsing (TMDB & AniList) is separated from playback logic (`CinemaOSPlayer` & `HDHubPlayer`).
2. **Dual-Engine Player Architecture**: Seamless switching between direct native HTML5 video streaming (via PixelDrain / Pengu / Cloudflare CDN streams with custom WebVTT subtitle parsing) and multi-provider iframe fallbacks (CinemaOS, VidSrc, AutoEmbed).
3. **Synchronized History Routing**: Client-side lightweight browser history routing with URL persistence (`/movie/:id`, `/tv/:id`, `/anime/:id`, `/watch/...`) and modal overlays.
4. **Resilient Data Layer**: In-memory caching (`Map`), fallback API keys, curated offline metadata, and safe image CDN re-writers (`optimizeTmdbImage`).

```
                     +-----------------------------------+
                     |        main.tsx (Lenis Scroll)    |
                     +-----------------+-----------------+
                                       |
                     +-----------------v-----------------+
                     |             App.tsx               |
                     |  (Router, State & Navigation)     |
                     +---+-----------+---------------+---+
                         |           |               |
           +-------------v-+   +-----v-------+  +----v--------------------+
           | Discovery     |   | Anime Hub   |  | Playback Engine         |
           | Pages         |   | (AniList)   |  | (CinemaOSPlayer Modal)  |
           | - HomePage    |   +-------------+  +----+--------------------+
           | - MoviesPage  |                         |
           | - TVShowsPage |            +------------+------------+
           | - Providers   |            |                         |
           +---------------+    +-------v-------+         +-------v-------+
                                | Direct Player |         | Fallback      |
                                | (HDHubPlayer) |         | Iframes       |
                                | - PixelDrain  |         | - CinemaOS    |
                                | - Pengu CDN   |         | - VidSrc      |
                                | - Subtitles   |         | - AutoEmbed   |
                                +---------------+         +---------------+
```

---

## 2. Directory Structure

```
frontend/
├── api/
│   └── pixeldrain/
│       └── [id].js             # Serverless/edge proxy for PixelDrain video chunks
├── public/                     # Static public assets (logos, favicon, etc.)
├── src/
│   ├── components/             # Reusable UI & Player components
│   │   ├── CinemaOSPlayer.tsx  # Top-level player container with fallback orchestrator
│   │   ├── HDHubPlayer.tsx     # Custom native video player with subtitle & audio track engine
│   │   ├── HeroBanner.tsx      # Main cinematic carousel
│   │   ├── MediaCard.tsx       # Standard backdrop card (16:9)
│   │   ├── PosterCard.tsx      # Vertical movie poster card (2:3)
│   │   ├── MediaRail.tsx       # Horizontal scrolling media row
│   │   ├── TopTenRow.tsx       # Numbered top-10 trending row
│   │   ├── ProviderRail.tsx    # Filtered provider catalog rail
│   │   ├── SearchModal.tsx     # Ctrl+K instant media search
│   │   └── VideoPlayerModal.tsx# Deprecated/lightweight fallback player
│   ├── data/                   # Curated metadata & static fallbacks
│   │   ├── cinemaosTvMatch.ts  # Pre-matched TV show IDs for reliable streaming
│   │   ├── trendingIndia.ts    # Curated regional content
│   │   └── curatedMovies.ts    # Featured curation
│   ├── pages/                  # Page-level view containers
│   │   ├── HomePage.tsx        # Trending feeds, hero carousel, genre rows
│   │   ├── MoviesPage.tsx      # Filtered movie catalog with genre tabs
│   │   ├── TVShowsPage.tsx     # TV series catalog with season filters
│   │   ├── AnimePage.tsx       # AniList catalog, anime hero, character rails
│   │   ├── DetailsPage.tsx     # Movie/TV details, seasons, episodes, cast
│   │   ├── AnimeDetailsPage.tsx# Anime episodes, character voices, relations
│   │   ├── ProvidersPage.tsx   # Netflix, Prime, Disney+, Apple TV tabs
│   │   ├── LiveSportsPage.tsx  # Live match center & schedules
│   │   ├── MusicPage.tsx       # Soundtracks & artists
│   │   ├── AISearchPage.tsx    # Semantic AI search
│   │   ├── WatchlistPage.tsx   # Saved user media
│   │   └── SettingsPage.tsx    # Preferences & player configuration
│   ├── services/               # API clients & external data providers
│   │   ├── tmdb.ts             # TMDB API client (movies, TV, genres, trending)
│   │   ├── anilist.ts          # AniList GraphQL client (anime data)
│   │   ├── animeLogo.ts        # Fanart/AniList logo caching service
│   │   ├── hdhub.ts            # Direct streaming extraction & audio parsing
│   │   └── subtitles.ts        # Wyzie subtitle API client & SRT-to-VTT converter
│   ├── types/
│   │   └── media.ts            # TypeScript interfaces (MediaItem, Episode, etc.)
│   ├── utils/
│   │   ├── imageUtils.ts       # TMDB image sizing & CDN optimization
│   │   └── mediaFilters.ts     # Safe media deduplication & rail filtering
│   ├── App.tsx                 # Core app state, navigation bar, router
│   ├── main.tsx                # React DOM root & Lenis smooth scroll
│   └── index.css               # Global Tailwind CSS & typography
├── test/
│   └── services-and-utils.test.ts # Automated regression test suite (Node tsx test runner)
└── vite.config.ts              # Vite configuration & split chunking
```

---

## 3. Core Data Flow & State Management

### A. Routing & Navigation
- Streamverse uses an in-app state router (`activeTab`, `selectedItem`, `selectedAnime`) coupled to the browser History API via `window.history.pushState` and `window.addEventListener('popstate', ...)`.
- URL structure:
  - `/` -> Home
  - `/movies` -> Movies catalog
  - `/tv` -> TV shows catalog
  - `/anime` -> Anime catalog
  - `/movie/:id` -> Movie details overlay
  - `/tv/:id` -> TV show details overlay
  - `/anime/:id` -> Anime details overlay
  - `/watch/:type/:id` -> Direct CinemaOS / HDHub player modal

### B. Media Metadata & Caching
- **TMDB Service (`src/services/tmdb.ts`)**:
  - Handles API querying with built-in fallbacks.
  - Safe in testing and SSR: guards `import.meta.env?.VITE_TMDB_API_KEY`.
  - Normalizes TMDB response payloads into strongly typed `MediaItem` objects via `formatTmdbItem()`.
- **AniList Service (`src/services/anilist.ts`)**:
  - Queries AniList GraphQL API for seasonal anime, trending anime, top anime, and characters.
  - Formats AniList entries into `MediaItem` models with `item_type: 'anime'`.

### C. Watchlist
- Stored directly in `localStorage` under the key `'streamverse_watchlist'`.
- Synchronized reactively across components via `onToggleWatchlist(item)`.

---

## 4. Video Streaming Pipeline

The video player system is located in `src/components/CinemaOSPlayer.tsx` and `src/components/HDHubPlayer.tsx`.

### Streaming Priority:
1. **Direct Stream Resolution (HDHub / Pengu)**:
   - When the user opens a title, `CinemaOSPlayer` checks if direct streaming is enabled (default: on).
   - Resolves stream URLs from Cloudflare CDN / PixelDrain / Pengu streams.
   - Parses audio streams and codec metadata (`parseAudioCodec`, `parseAudioLanguages`).
   - Fetches matching subtitles via Wyzie API (`src/services/subtitles.ts`), converts SRT to WebVTT with Blobs, and mounts `<track>` elements.
2. **PixelDrain Streaming Routes (`src/utils/pixeldrain.ts`)**:
   - PixelDrain direct video playback supports two selectable routes configurable in Settings or Player:
     - **Normal (Proxy)**: `/api/pixeldrain/:id` (proxies chunks via local edge proxy, recommended for restrictive ISPs).
     - **Direct Fast CDN**: `https://cdn.pixeldrain.eu.cc/:id` (direct high-speed EU CDN connection without proxy overhead).
   - Toggling routes reactively broadcasts window events and updates active video streams in real-time.
3. **Fallback Providers**:
   - If direct playback is disabled or fails, `CinemaOSPlayer` falls back to high-res embed iframes:
     - CinemaOS Engine
     - VidSrc / VidLink
     - AutoEmbed
     - MultiEmbed

---

## 5. Development & Testing Workflow

### Running the App Locally:
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

### Running Tests:
The automated regression suite tests critical data parsing, audio metadata extraction, TMDB formatting, and media filters using the built-in Node.js test runner with `tsx`:
```bash
npm test
```

### Linting:
Fast rust-based linting is powered by `oxlint`:
```bash
npm run lint
```

### Production Build:
```bash
npm run build
```

---

## 6. Guidelines for Adding New Features

1. **Adding a New Discovery Rail**:
   - Place API calls in `src/services/tmdb.ts` or appropriate service.
   - Use `mergeValidMediaWithFallback` from `src/utils/mediaFilters.ts` to filter out broken posters.
   - Render using `<MediaRail />` with `posterAspect={false}` (16:9) or `posterAspect={true}` (2:3).
2. **Adding a New Streaming Provider**:
   - Add the provider config in `src/components/CinemaOSPlayer.tsx` `PROVIDERS` list.
   - Maintain the existing contract: accepts `item.id`, `item.media_type`, `season`, `episode`.
3. **Preserving Performance**:
   - Keep callback handlers wrapped in `useCallback` when passed to `HDHubPlayer` to prevent playback stutter and listener thrashing.
   - Optimize images using `optimizeTmdbImage(url, 'poster' | 'backdrop')`.
