# Performance Engineering Audit & Analysis (Agent 1)

**Application**: StreamVerse 2  
**Target URL**: `http://localhost:4173/` (Production Preview)  
**Date**: October 2026  
**Status**: COMPLETE  

---

## 1. Executive Summary & Core Web Vitals Baseline

An exhaustive performance audit was conducted on the production build of StreamVerse 2. The audit evaluated Core Web Vitals (LCP, INP, CLS), asset payloads, JavaScript execution overhead, network efficiency, rendering pipelines, and runtime bottlenecks.

### Baseline Metrics Summary

| Metric | Measured Baseline | Target Threshold | Status | Risk Level |
|---|---:|---:|:---:|:---:|
| **Largest Contentful Paint (LCP)** | 1.84s (synthetic cold) / 0.72s (warm) | < 2.5s | Passing | Moderate |
| **First Contentful Paint (FCP)** | 216ms | < 1.8s | Excellent | Low |
| **Time to First Byte (TTFB)** | 4ms (local) / ~85ms (edge) | < 800ms | Excellent | Low |
| **Cumulative Layout Shift (CLS)** | 0.0000 | < 0.1 | Excellent | Low |
| **Total Blocking Time (TBT)** | 0ms (warm) / 140ms (cold initial parse) | < 200ms | Passing | Moderate |
| **Total Transferred JS (Uncompressed)** | 2,348 kB | < 500 kB | FAILING | HIGH |
| **Total Transferred JS (Gzipped)** | 711 kB | < 200 kB | FAILING | HIGH |
| **CSS Payload** | 229 kB (36.5 kB gzipped) | < 100 kB (uncomp) | Needs Review | Medium |
| **Initial HTTP Requests** | 84 requests | < 40 requests | Elevated | Medium |
| **Initial Image Transfer** | 614 kB | < 800 kB | Passing | Medium |

---

## 2. In-Depth Bottleneck Analysis

### A. Heavy Third-Party & Vendor JavaScript Bundles
Analysis of `dist/assets` revealed massive vendor chunks that load synchronously or block client thread resources:
1. **`vendor-player` (`hls.js`)**:
   - **Size**: 575.82 kB uncompressed (179.22 kB gzipped).
   - **Issue**: `hls.js` is bundled into a vendor chunk that is imported when players initialize. If statically bundled or preloaded, it consumes significant memory.
2. **`vendor-sentry` (`@sentry/react`)**:
   - **Size**: 449.84 kB uncompressed (150.36 kB gzipped).
   - **Root Cause**: `src/main.tsx` statically imports `initSentry` from `./utils/sentry.ts` on line 6:
     ```ts
     import { initSentry } from './utils/sentry.ts'
     ```
     Even though `initSentry()` is scheduled inside `requestIdleCallback`, static ES module imports cause Rollup to bundle `@sentry/react` into the initial download graph!
3. **`vendor-posthog` (`posthog-js`)**:
   - **Size**: 307.97 kB uncompressed (103.16 kB gzipped).
   - **Root Cause**: `src/main.tsx` statically imports `initPostHog` from `./services/analytics.ts` on line 9, and `App.tsx` imports tracking helpers statically.
4. **Combined Initial Telemetry Overhead**:
   - PostHog + Sentry alone add **757.8 kB uncompressed (253.5 kB gzipped)** to the initial download of an entertainment app before any video or media card is rendered.

### B. Ineffective Dynamic Imports & Chunk Fragmentation
During `npm run build`, Rollup flags two critical warnings:
```text
[INEFFECTIVE_DYNAMIC_IMPORT] src/data/mediaData.ts is dynamically imported by src/App.tsx but also statically imported by src/components/GenreRail.tsx, src/components/ProviderRail.tsx, src/pages/AISearchPage.tsx, src/pages/DetailsPage.tsx, src/pages/MusicPage.tsx, ..., dynamic import will not move module into another chunk.

[INEFFECTIVE_DYNAMIC_IMPORT] src/services/analytics.ts is dynamically imported by src/store/useWatchlistStore.ts but also statically imported by src/App.tsx, src/components/CinemaOSPlayer.tsx, src/components/SearchModal.tsx, src/main.tsx, dynamic import will not move module into another chunk.
```
- **Impact**: Dynamic import splitting fails, leaking `mediaData.ts` and `analytics.ts` across multiple parent chunks.

### C. Eager Top-Level Route Prefetching in `App.tsx`
Lines 29-31 of `src/App.tsx`:
```ts
// Eagerly prefetch core route chunks so navigation between Home, Movies, and TV is instant
const moviesPagePromise = import('./pages/MoviesPage');
const tvShowsPagePromise = import('./pages/TVShowsPage');

const MoviesPage = React.lazy(() => moviesPagePromise);
const TVShowsPage = React.lazy(() => tvShowsPagePromise);
```
- **Impact**: The moment a user visits `/`, the browser immediately initiates asynchronous downloads of `MoviesPage` (27 kB JS) and `TVShowsPage` (3.3 kB JS) plus dependencies. This steals bandwidth from the LCP image (`8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg`) on slower mobile 3G/4G connections.

### D. Security Defense CPU Burn
In `src/utils/securityDefense.ts`:
- Three recurring timers are registered:
  - `setInterval(checkDebuggerTiming, 600)`
  - `setInterval(console.clear, 800)`
  - `setInterval(probeImage, 1000)`
- Additionally, a `resize` listener triggers `checkDebuggerTiming` repeatedly.
- On low-power mobile devices and laptops, these periodic timers keep the main thread awake, degrading CPU battery efficiency and elevating Interaction to Next Paint (INP) latency during interactions.

### E. Font and Hero Image Preloads
In `index.html`:
- Font preload: `<link rel="preload" href="/media/36966cca54120369-s.p.woff2" as="font" type="font/woff2" crossorigin />` successfully minimizes render blocking.
- Hero image preload:
  ```html
  <link rel="preload" as="image" href="https://image.tmdb.org/t/p/w780/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg" media="(max-width: 640px)" fetchpriority="high" />
  <link rel="preload" as="image" href="https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg" media="(min-width: 641px)" fetchpriority="high" />
  ```
  This is well tuned and delivers 216ms FCP. However, dynamic hero rotation means if the trending title changes in TMDB, the preloaded image might become stale if not aligned with fallback data.

---

## 3. Prioritized Recommendations for Implementation

1. **Lazy Dynamic Import for Telemetry (Sentry & PostHog)**:
   - Convert `import { initSentry } from './utils/sentry'` and `import { initPostHog } from './services/analytics'` in `src/main.tsx` into dynamic `import()` calls inside the `requestIdleCallback` block.
   - Decouple static imports of `analytics.ts` from `App.tsx` and `useWatchlistStore.ts`.
   - **Expected Savings**: ~750 kB uncompressed / ~250 kB gzipped removed from critical initial bundle!
2. **Eliminate Ineffective Dynamic Imports**:
   - Refactor `mediaData.ts` consumers (`GenreRail`, `ProviderRail`, `AISearchPage`, etc.) to use either dynamic loading consistently or extract lightweight shared types/interfaces to prevent chunk hoisting.
3. **Intent-Based Route Prefetching**:
   - Replace eager top-level `const moviesPagePromise = import(...)` with viewport or hover/focus prefetching (e.g. `onMouseEnter` / `onFocus` on navigation links).
4. **Decommission Heavy Polling Intervals in `securityDefense.ts`**:
   - Remove redundant `setInterval` loops checking debugger timing and console clearing.
5. **Modern Compression & Rollup Minification**:
   - Ensure build output enables esbuild/terser drop of `console.debug` in production.
