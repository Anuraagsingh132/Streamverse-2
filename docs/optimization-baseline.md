# Baseline Architecture & Risk Analysis

**Project**: StreamVerse 2  
**Date**: October 2026  
**Auditor**: Autonomous Optimization & Security Engineering Team  

---

## 1. System Architecture Overview

StreamVerse 2 is a cinema and entertainment streaming portal built as a modern client-side Single Page Application (SPA) with edge acceleration and serverless companion handlers.

```
                           +--------------------------------+
                           |          Vercel Edge           |
                           |  - Static Assets & HTML        |
                           |  - SPA Rewrites                |
                           |  - Edge OG Function (/api/og)  |
                           |  - Serverless Proxy            |
                           +---------------+----------------+
                                           |
                               +-----------+-----------+
                               |                       |
                +--------------v------------+   +------v--------------------+
                |  React 19 Client SPA      |   | Cloudflare Worker Proxy   |
                |  - Vite 8 Bundler         |   | (cloudflare-worker)       |
                |  - React Router DOM 7     |   | - 206 Partial Content     |
                |  - Tailwind CSS / Motion  |   | - Stream Failover         |
                |  - Lenis Smooth Scroll    |   | - L1/L2 Edge Caching      |
                +--------------+------------+   +---------------------------+
                               |
            +------------------+------------------+
            |                  |                  |
    +-------v--------+  +------v-------+   +------v--------+
    | TMDB v3 API    |  | AniList API  |   | Video CDN     |
    | (Metadata)     |  | (GraphQL)    |   | (Pixeldrain / |
    |                |  |              |   |  CinemaOS)    |
    +----------------+  +--------------+   +---------------+
```

### Component Breakdown

| Dimension | Specification |
|---|---|
| **Framework** | React 19.3.0, React DOM 19.3.0, React Router DOM 7.18.4, TypeScript 6.0.3 |
| **Bundler & Build** | Vite 8.3.2, Rollup manual chunking, ES2022 target |
| **Package Manager** | npm (package-lock.json v3) |
| **Styling** | Tailwind CSS v4 / modern CSS variables (`index.css`) |
| **Animations & FX** | Motion (`motion` 14.0.0), Lenis Smooth Scroll (`lenis` 1.3.26), Lucide Icons (`lucide-react` 1.50.0) |
| **Player Pipeline** | HLS.js 1.7.3 (`vendor-player`), HTML5 video engine (`HDHubPlayer.tsx`), CinemaOS fallback iframes (`CinemaOSPlayer.tsx`) |
| **Database & Persistence** | Client-side: `localStorage` (`streamverse_watchlist`, `streamverse_settings`, `streamverse_continue_watching`), in-memory bounded LRU cache (`LRUCache`), session disk cache; no direct SQL/NoSQL DB |
| **APIs** | TMDB REST v3, AniList GraphQL, Wyzie Subtitles REST API, PixelDrain API, Pengu/CinemaOS live stream endpoints |
| **Telemetry & Feedback** | PostHog (`@posthog/react` 1.11.3, `posthog-js` 1.438.12), Sentry (`@sentry/react` 11.6.0), Featurebase (`featurebase-js` 1.0.3) |
| **Hosting & Edge** | Vercel (SPA static deployment + Edge OG Generator `api/og.js`) + Cloudflare Worker (`cloudflare-worker/worker.js`) |
| **CDN** | Cloudflare Edge, Vercel Edge Network, TMDB Image CDN (`image.tmdb.org`), Pixeldrain CDN (`cdn.pixeldrain.eu.cc`) |

---

## 2. Server vs Client Boundaries

1. **Client SPA (`src/`)**:
   - Executes 100% in the user's browser.
   - Manages router state, playback controls, local cache layers, UI animations, and media catalog queries.
2. **Edge Function (`api/og.js`)**:
   - Executes at Vercel's edge network (`runtime: 'edge'`).
   - Intercepts social crawler user-agents (Twitterbot, Discordbot, Facebookexternalhit, WhatsApp, etc.) via `vercel.json` rewrites and generates dynamic HTML metadata cards.
3. **Serverless Function (`api/pixeldrain/[id].js`)**:
   - Vercel Node/Edge function acting as a fallback proxy for video chunks.
4. **Cloudflare Worker (`cloudflare-worker/worker.js`)**:
   - Independent high-throughput edge worker with HTTP 206 byte-range streaming, dual-tier edge cache (L1 in-isolate RAM + L2 Cloudflare Cache API), and multi-mirror video failover.

---

## 3. Existing Tooling & Test Suite State

- **Unit Testing**: Node.js `tsx --test test/services-and-utils.test.ts` (30 tests passing, ~1.7s execution).
- **Component Testing**: Vitest 5.0.3 with `@testing-library/react` and `jsdom` (19 tests passing across 3 suites, ~53s execution).
- **Linting**: Oxlint 1.86.0 (43 warnings, 0 fatal errors, 462ms execution).
- **End-to-End Testing**: Playwright 1.64.0 (5 tests defined, 1 passing, 4 failing due to strict selector duplicates and element visibility checks).

---

## 4. Current Architecture Risks & Inefficiencies

### A. Performance & Bundle Bloat
1. **Uncompressed & Heavy Vendor Bundles**:
   - `vendor-player` (`hls.js`): 575.82 kB (179.22 kB gzipped) loaded into chunks.
   - `vendor-sentry` (`@sentry/react`): 449.84 kB (150.36 kB gzipped) statically imported in `src/main.tsx`.
   - `vendor-posthog` (`posthog-js`): 307.97 kB (103.16 kB gzipped) statically imported in `src/main.tsx` and `src/App.tsx`.
   - Total initial vendor overhead exceeds 1.3 MB uncompressed!
2. **Ineffective Dynamic Imports**:
   - `src/data/mediaData.ts` and `src/services/analytics.ts` are dynamically imported in some modules but statically imported in others, preventing code-splitting and causing Rollup `[INEFFECTIVE_DYNAMIC_IMPORT]` warnings.
3. **Top-Level Route Chunk Prefetching**:
   - In `src/App.tsx`, `moviesPagePromise` and `tvShowsPagePromise` initiate module downloads immediately at module load time rather than on user intent, competing with critical initial LCP resources.
4. **CSS Bundle Size**:
   - `dist/assets/index-*.css` is 229 kB uncompressed (36.5 kB gzipped).

### B. Security Risks
1. **High Severity Vulnerabilities**:
   - `npm audit` flags 2 high-severity vulnerabilities:
     - `undici` (8.0.0 - 8.12.1): DoS via unbounded memory in EventSource parser, SRI bypass, unhandled error on excessive content-encodings.
     - `vite` (8.3.0 - 8.3.2): Arbitrary command execution & cross-origin script execution vulnerabilities.
2. **Permissive Content Security Policy (CSP)**:
   - `vercel.json` specifies `'unsafe-inline'` for `script-src` and `style-src`.
3. **Hardcoded API Secrets in Client Bundles**:
   - TMDB fallback key `1cf50e6248dc270629e802686245c2c8` is hardcoded across client files, serverless handlers, and worker code.
4. **Anti-Inspection Deterrent (`src/utils/securityDefense.ts`)**:
   - Uses `setInterval` every 600ms, 800ms, and 1000ms checking `debugger` execution timing, wiping `console.log`, and blocking right click + keyboard shortcuts.
   - Degrades browser performance, consumes CPU, breaks keyboard navigation and user debugging, while offering zero actual security against determined scrapers or attackers.

### C. Accessibility & UX Issues
1. **Shortcut & Right-Click Hijacking**:
   - Intercepting `contextmenu` and shortcuts (`F12`, `Ctrl+Shift+I`, `Ctrl+U`, `Ctrl+S`) violates accessibility standards and assistive technology workflows.
2. **Mobile Navigation & Dock Duplication**:
   - Dual branding links (`Streamverse Home`) causing Playwright strict mode resolution failures.
   - Dual action buttons (desktop vs mobile) rendered simultaneously in DOM without proper `aria-hidden` or conditional unmounting.

### D. SEO & Discoverability
1. **Sitemap Generation**:
   - Dynamic sitemap generates 63 URLs, but lacks `lastmod` timestamps, change frequencies, and deep catalog indexation.
2. **Social Preview Meta Consistency**:
   - OpenGraph and Twitter card metadata require alignment between dynamic edge OG handler and static HTML fallbacks.

---

## 5. Next Steps
- Execute Phase 1: Tooling configuration (Lighthouse, Axe, Bundle Analyzer, Playwright test fixes).
- Execute Phase 2: Complete empirical baseline measurement across Performance, Security, Accessibility, and SEO.
- Execute Phase 3: Multi-agent specialized audits and report generation.
- Execute Phase 4: Prioritized optimization roadmap.
