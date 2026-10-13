# Streamverse 2 Performance and Reliability Audit

**Audit date:** 2026-10-10  
**Scope:** Repository source, deployment configuration, one production build, and Oxlint. Read-only with respect to application source and configuration.  
**Overall assessment:** The app has deliberate route splitting, bounded caches in several major data clients, image lazy-loading in most rails, and a successfully generated production build. Confirmed costs remain in the initial stylesheet and optional player/anime bundles; code also fans out multiple API requests on catalog routes. Proxy fallback latency and browser request hangs are credible reliability risks. There is no evidence to assign an overall live-site performance score or Core Web Vitals grade.

**Workspace note:** Initial status showed no modified application source. At final review, `src/components/CinemaOSPlayer.tsx` had become modified, with a substantial player-control markup/layout diff. I did not make that change or reset it; it is preserved and excluded from the audit's claim that no changes were made by the auditor. The final build ran while the workspace was shared, so it may reflect whichever version was present at build time.

## Executive summary

The project is a client-rendered React 19 SPA built with TypeScript, Vite 8, React Router 7, Motion, Lenis, and HLS.js. It retrieves catalog and detail data directly from TMDB and AniList. PixelDrain streaming is handled through a Vercel Edge Function and a Cloudflare Worker. No conventional application server, application database, schema, or queue is present in the inspected repository. User settings, watchlist, playback history, and portions of API caches use browser storage.

The strongest measured concern is the global CSS: **213.17 kB raw / 33.57 kB gzip** in the audit build. Player code is well separated from route entry, but its player vendor chunk is **575.82 kB raw / 179.22 kB gzip**. The anime fallback data creates a separate **273.06 kB raw / 75.26 kB gzip** JavaScript chunk; the same data is also copied as a **346,344-byte** public JSON file. These are build facts, not proof that both copies download in one journey.

No P0 or P1 performance incident is established from this local audit. Findings below prioritize P2 risks and P3 hypotheses. No application source, configuration, dependencies, deployment resources, or data were changed. The only added file is this report.

## Architecture and coverage

| Area | Discovered implementation |
|---|---|
| Frontend | React 19 + TypeScript SPA, Vite 8, React Router 7, lazy route modules |
| Rendering | Client-side rendering; no server rendering found |
| Catalog APIs | TMDB REST and AniList GraphQL called from the browser |
| Playback APIs | HDHub/Pengu resolver calls from browser; PixelDrain proxy on Vercel Edge and Cloudflare Worker; iframe fallbacks |
| Persistence/cache | In-memory LRU and request deduplication for TMDB/AniList; local/session storage; short-lived stream caches; watchlist and playback history in local storage |
| Hosting | Vercel rewrite/header config; optional two-stage Docker/Nginx static hosting; Cloudflare Worker config |
| Database/jobs | None found in repository; no schema, ORM, migrations, queue, or scheduled job implementation found |
| Observability | Sentry initialization and console logging; no RUM/Web Vitals collection or application metrics configuration found |
| Build/package | npm lockfile, Vite/Rollup manual chunks, TypeScript project build, Oxlint |

Reviewed all source paths under `src/`, app/service/configuration files, the proxy and Worker, test configuration, and available deployment files. The key journeys represented in code are home/catalog discovery, search, details, anime, watchlist/history, and playback. The deployment account, runtime environment variables, production logs, provider accounts, and live routes were not available; repository inspection cannot verify their deployed state. No database or query plan could be inspected because no application database is present.

## Safe checks and measurement method

- `npm run lint` — **passed**, Oxlint exited 0.
- `npm exec vite -- build --outDir <new temporary directory>` — **passed**, 2,651 modules transformed; Vite generated its gzip size report. Output went to a newly created OS temporary directory. The build script was not run, so the sitemap generator did not write to `public/`.
- No tests, load tests, external service calls, production profiling, or browser visits were run. The user requested audit only; developer instructions also prohibit running tests unless requested.
- Vite gzip sizes are build-tool estimates for gzip transfer, not measured HTTP responses. Brotli, actual caching, route-specific request waterfalls, and bytes transferred for a user journey were not measured.
- No lab or real-user LCP, INP, CLS, FCP, TTFB, TBT, memory, or CPU data is available. The build environment is not a browser device profile.

### Build size observations

| Artifact | Raw | Gzip | Interpretation |
|---|---:|---:|---|
| Global CSS | 213.17 kB | 33.57 kB | Loaded as a shared stylesheet; sizeable for every route |
| HLS/player vendor | 575.82 kB | 179.22 kB | Large, but player-related and not part of an ordinary discovery interaction unless imported by that path |
| Anime fallback JS data | 273.06 kB | 75.26 kB | Lazy data chunk used by the anime fallback import |
| React/vendor chunk | 341.29 kB | 110.22 kB | Shared runtime; build output size only, not a complete initial-request total |
| Motion vendor | 126.52 kB | 41.55 kB | Shared animated UI dependency |
| Main route entry JS | 52.04 kB | 16.25 kB | Entry chunk, excluding its static dependency chunks |

Anime data is present at `src/data/animeInitialData.json` and duplicated at `public/data/animeInitialData.json` (346,344 bytes each). `AnimePage` has both a `fetch('/data/...')` fallback and a dynamic import of the source JSON. This creates duplicate deployable representations; whether a given journey downloads both is not proven by source inspection alone.

## Prioritized findings

### PERF-01 — Global CSS payload is large

- **Category / priority:** Frontend / P2
- **Location:** `src/index.css`; build output `assets/index-*.css`
- **Evidence:** The production build measured 213.17 kB raw and 33.57 kB gzip for the global stylesheet. It is imported by `src/main.tsx` and therefore shared by routes.
- **Current behavior / root cause:** A single global stylesheet contains the reset, utility classes, and application styles. Its delivered compressed size is materially larger than the route entry JS gzip size.
- **Impact:** Additional transfer and stylesheet parse work on first load, particularly on constrained mobile networks. No user-visible delay was measured.
- **Confidence:** Confirmed size; performance impact is strongly suspected, magnitude unverified.
- **Safe reproduction:** Run the same Vite production build and compare its stylesheet gzip report.
- **Recommendation / expected benefit:** Inspect generated CSS usage and split truly route-exclusive style rules only if build analysis shows they can be removed from the shared entry without changing appearance. Expected benefit is lower shared CSS transfer/parse cost, not quantified beyond the existing 33.57 kB gzip baseline.
- **Trade-offs / verification:** Splitting can add requests and risk missing styles. Verify identical screenshots and route coverage after any approved remediation; compare production gzip bytes and browser style recalculation traces.

### PERF-02 — Player vendor chunk is substantial

- **Category / priority:** Frontend / P2
- **Location:** `vite.config.ts` manual chunk configuration; `src/components/player/useHlsPlayback.ts`; `src/App.tsx` lazy player import
- **Evidence:** Build output reports the player vendor chunk as 575.82 kB raw / 179.22 kB gzip. HLS.js is included as a dedicated vendor chunk. Player and watch routes are lazy-loaded.
- **Current behavior / root cause:** HLS playback capability adds a large optional code payload. Route splitting already prevents treating this whole chunk as an ordinary home-page payload.
- **Impact:** More transfer and parse work when a user enters the HLS playback path; possible player startup delay on low-end devices. No startup profile was captured.
- **Confidence:** Confirmed artifact size; journey-level cost and user impact unverified.
- **Safe reproduction:** Run the production Vite build; use browser network/Performance tooling on a playback route to verify when the chunk is requested and measure parse/compile time.
- **Recommendation / expected benefit:** Preserve lazy loading and inspect whether only the HLS playback path needs the dependency. Any further loading changes must preserve player behavior and be justified by a browser trace.
- **Trade-offs / verification:** Delayed loading may add first-play latency. Compare playback readiness and all supported stream types, not only bundle bytes.

### PERF-03 — Catalog routes initiate broad parallel API fan-out

- **Category / priority:** Network / P2
- **Location:** `src/pages/HomePage.tsx:46-70`, `src/pages/MoviesPage.tsx:58-80`, `src/pages/TVShowsPage.tsx:58-80`, `src/components/ProviderRail.tsx:59-90`, `src/components/GenreRail.tsx:47-55`
- **Evidence:** Home starts four TMDB calls; Movies and TV each start seven in mount effects. ProviderRail independently fetches a provider catalog on mount and GenreRail fetches its selected genre. The calls are not awaited as one serial chain, but all can begin when the route mounts.
- **Current behavior / root cause:** A catalog page populates many rails from separate endpoint requests while showing curated fallback data. Shared TMDB caching deduplicates identical URL requests but not distinct rails/endpoints.
- **Impact:** Request concurrency and response/storage work increase on entry; slower connections can keep enrichment work in flight. The exact number of unique requests in a session depends on cached results and component composition. No network trace or API quota data was available.
- **Confidence:** Request fan-out confirmed; measurable user impact unverified.
- **Safe reproduction:** Clear browser site storage, load each catalog route in DevTools Network, count distinct TMDB requests and record request/response sizes and timing.
- **Recommendation / expected benefit:** Use route network traces to determine whether less prominent rails can retain curated content until needed, or whether requests can be safely consolidated. Expected benefit is lower initial concurrency/transfer only if unused rail data is not fetched.
- **Trade-offs / verification:** Deferring requests can delay rail freshness or alter content availability. Preserve data freshness, ordering, and fallback behavior; compare request counts and screenshots.

### PERF-04 — Upstream mirror fallback can delay proxy failure

- **Category / priority:** Backend/proxy reliability / P2
- **Location:** `api/pixeldrain/[id].js:127-150`; `cloudflare-worker/worker.js:130-153`
- **Evidence:** Both proxies try up to three mirrors sequentially and apply a 10-second timeout to each fetch. If all mirrors time out, the code can spend up to roughly 30 seconds awaiting upstream response headers before returning 502. This bound follows directly from the sequential loop and per-attempt timeout; it is not a measured production latency.
- **Current behavior / root cause:** A failed or unreachable upstream is retried against each candidate in series, with no shared overall deadline or latency-based circuit state.
- **Impact:** Playback resolution may remain pending for tens of seconds during multi-mirror incidents and tie up edge request duration; failures can appear as stalled playback.
- **Confidence:** Strongly suspected operational impact; upper-bound behavior confirmed from code.
- **Safe reproduction:** In a local isolated harness with mocked fetch responses, make each mirror time out and measure total handler duration. Do not direct this test at production mirrors.
- **Recommendation / expected benefit:** Consider a bounded end-to-end deadline and evidence-based mirror health strategy. This can cap tail latency, but no improvement should be claimed until measured.
- **Trade-offs / verification:** A shorter total deadline can reduce the chance that a healthy later mirror succeeds. Test successful first/second/third mirror, 404, range, and all-timeout cases in mocks.

### PERF-05 — Browser API requests generally have no explicit timeout or cancellation

- **Category / priority:** Network/reliability / P2
- **Location:** `src/services/tmdb.ts:34-39, 98-101`; `src/services/anilist.ts:253-260, 485-492`; `src/services/hdhub.ts:291-299`; `src/services/pengu.ts:154-162`; `src/services/subtitles.ts:176, 212`; `src/services/animeLogo.ts:51`
- **Evidence:** These fetch calls do not pass an AbortSignal. Several page effects use an `isMounted` guard to avoid setting state after unmount, but the underlying request continues. Proxy fetches separately do use a 10-second timeout.
- **Current behavior / root cause:** Requests depend on browser/network completion and some in-flight data work cannot be canceled when the route or search intent changes.
- **Impact:** Slow/hung services can keep loading states open; obsolete search or route requests can consume bandwidth and upstream quota. Frequency and latency are unknown.
- **Confidence:** Missing timeouts/cancellation confirmed; user impact strongly suspected.
- **Safe reproduction:** Use browser DevTools request throttling/blocking in a local session and navigate away or issue new searches; observe pending requests and loading behavior.
- **Recommendation / expected benefit:** Add request deadlines and cancellation only where lifecycle semantics support it; avoid indiscriminate retries. This should cap stale work and loading duration, with no quantified gain established.
- **Trade-offs / verification:** Cancellation and timeout errors must not be mistaken for server failures or trigger retry loops. Verify search, route changes, fallback content, and player resolver flows.

### PERF-06 — Anime fallback data is duplicated in build inputs

- **Category / priority:** Frontend/network / P2
- **Location:** `src/data/animeInitialData.json`, `public/data/animeInitialData.json`, `src/pages/AnimePage.tsx:11-20`
- **Evidence:** Both source files are 346,344 bytes. Build output contains a 273.06 kB raw / 75.26 kB gzip JS data chunk and also copies the public JSON asset. AnimePage references both the public fetch path and a dynamic JSON import as fallback sources.
- **Current behavior / root cause:** One dataset is maintained in two physical copies and represented once as a public static resource and once as importable module data.
- **Impact:** At least duplicated deployment/storage bytes and risk that both copies are requested in a fallback path. Exact network duplication in a normal journey is not established.
- **Confidence:** Duplicate files and build artifacts confirmed; duplicate user transfer unverified.
- **Safe reproduction:** Inspect Network requests on Anime with normal API success and with AniList blocked, and compare hashes of the two JSON files.
- **Recommendation / expected benefit:** Select a single canonical data source after confirming required fallback behavior; expected benefit is smaller deploy artifact and potentially less fallback transfer.
- **Trade-offs / verification:** Removing either copy could break offline/fallback behavior. Test normal, API-failure, and direct-route scenarios and check payload totals.

### PERF-07 — Subtitle lookup cache is unbounded and has no in-flight deduplication

- **Category / priority:** Frontend/reliability / P2
- **Location:** `src/services/subtitles.ts:186-212, 254`
- **Evidence:** `subtitleCache` is a plain `Map` with no eviction/TTL. Cache lookup occurs before fetch, but concurrent identical misses are not coalesced.
- **Current behavior / root cause:** Each unique media/episode subtitle result remains reachable for the lifetime of the page session; simultaneous same-key calls can both request the provider.
- **Impact:** Memory grows with unique playback episodes visited during a long session and duplicate subtitle endpoint traffic can occur on races. Typical session size and retained payload are not measured.
- **Confidence:** Unbounded cache and missing deduplication confirmed; practical memory impact unverified.
- **Safe reproduction:** In an isolated browser session, invoke lookups for many unique episode keys and track heap/map growth; issue simultaneous requests for one key and count provider requests.
- **Recommendation / expected benefit:** Bound cache size/age and coalesce in-flight lookups if profiling confirms retention or duplicate calls matter.
- **Trade-offs / verification:** Eviction may require refetching subtitles. Confirm that caching still covers expected playback navigation and that failures are not cached as permanent empties.

### PERF-08 — Anime episode fallback can allocate an unexpectedly large list

- **Category / priority:** Frontend/reliability / P2
- **Location:** `src/services/anilist.ts:347-358`
- **Evidence:** When episode count is missing, code defaults to 12; otherwise it loops once for every server-provided episode count and creates an episode object for each. There is no local upper bound.
- **Current behavior / root cause:** A remote metadata field controls the number of generated client-side episode objects.
- **Impact:** A malformed or extreme upstream count could create large synchronous allocation and render work. No such response or user-facing slowdown was observed.
- **Confidence:** Unbounded allocation condition confirmed; exploitability/realistic provider data unverified.
- **Safe reproduction:** Unit-level isolated fixture with a large episode count, measuring allocation/render cost; do not modify or query live provider data.
- **Recommendation / expected benefit:** Validate/cap the accepted count or load episode representations only when needed, while preserving real title episode navigation.
- **Trade-offs / verification:** An arbitrary cap could omit valid episodes; derive a safe policy from provider data and test large legitimate seasons.

### PERF-09 — Proxy is a public bandwidth relay with broad CORS origin matching

- **Category / priority:** Security/reliability / P2
- **Location:** `cloudflare-worker/worker.js:22-42, 50-72, 100-115`; `cloudflare-worker/wrangler.toml:5-6`; `api/pixeldrain/[id].js:12-30, 43-69`
- **Evidence:** GET/HEAD requests without an Origin receive `Access-Control-Allow-Origin: *`; there is no caller authentication or rate limit in the inspected handler. Worker configuration accepts every origin host equal to or a subdomain of `workers.dev` (and listed domains). The target host set and file ID format are constrained, so this is not an arbitrary-URL SSRF proxy.
- **Current behavior / root cause:** Anyone able to reach the endpoint can request valid PixelDrain IDs and stream proxied byte ranges; CORS controls browser read access but does not authenticate non-browser callers. Streaming proxy work consumes egress and edge request capacity.
- **Impact:** Potential bandwidth/compute exhaustion or service quota consumption under abuse; no abuse evidence or usage metrics were supplied.
- **Confidence:** Public relay and broad CORS behavior confirmed; operational impact unverified.
- **Safe reproduction:** Review deployed route access policy and usage dashboards; no probing or load generation is needed.
- **Recommendation / expected benefit:** Review required callers and provider limits, then consider appropriate rate/egress controls and exact origin policy without breaking native video clients.
- **Trade-offs / verification:** Requiring Origin/auth may break video tags, external players, or direct clients. Verify actual player request headers and range seeking before tightening access.

### PERF-10 — Error telemetry is configured as production-enabled without an operational DSN

- **Category / priority:** Observability/reliability / P2
- **Location:** `src/utils/sentry.ts:11-20`
- **Evidence:** Production enables Sentry even when `VITE_SENTRY_DSN` is absent, by supplying a placeholder DSN. Traces are sampled at 20% in production and 100% in development. The placeholder destination is intentionally not reproduced here.
- **Current behavior / root cause:** The app initializes the Sentry SDK in production regardless of whether a valid project endpoint is configured.
- **Impact:** Production errors may not arrive in the operator's Sentry project, leaving performance/error diagnosis incomplete. SDK initialization and tracing also have runtime overhead, but its size/cost was not isolated in this audit.
- **Confidence:** Configuration confirmed; actual deployed DSN override and event delivery unverified.
- **Safe reproduction:** Inspect deployed build environment and verify a controlled test event in the intended Sentry project; do not send synthetic user data.
- **Recommendation / expected benefit:** Make production observability state match the configured endpoint and explicitly set sampling for the desired telemetry volume. The expected benefit is actionable monitoring and controlled overhead, not faster application code directly.
- **Trade-offs / verification:** Lower sampling reduces visibility; verify error capture and trace volume in a staging environment.

## Lower-priority observations and hypotheses

| ID | Priority | Observation | Evidence and limits |
|---|---|---|---|
| PERF-11 | P3 | Hero backdrop glow can be GPU/compositing intensive | `HeroBanner.tsx` renders up to three large backdrop images with 48px blur, saturation, fixed positioning, and opacity transitions. DOM count is capped to near slides. Device-level GPU/paint cost is unmeasured; profile before changing it. |
| PERF-12 | P3 | Sentry and browser console receive raw error objects/context | `sentry.ts` logs original errors and passes optional context to Sentry. This may expose sensitive values if callers attach them, but no secrets or personal data were found in the report or logged during this audit. Review call-site context and data scrubbing before classifying as a defect. |
| PERF-13 | P3 | Proxy caches byte-range responses publicly | Both proxy implementations return public cache directives including `s-maxage` for responses that can be 206 and forward `Content-Range`. Whether the hosting CDN keys/normalizes range requests safely is platform-dependent and unverified. Inspect actual cache behavior before changing policy; incorrect shared range caching can cause playback corruption. |
| PERF-14 | P3 | Storage sweep work repeats on each cache write | `safeSetStorageItem` invokes a prefix scan, JSON parse, sort, and possible evictions for each write. Catalog fan-out can cause several sequential main-thread storage sweeps. Impact depends on localStorage key count and response size; no browser profile was taken. |
| PERF-15 | P3 | Client-side TMDB key is visible in browser code | `VITE_TMDB_API_KEY` and a fallback key are embedded into client-side requests. This is expected for a browser API key, not a server secret; quota attribution/abuse exposure depends on TMDB restrictions and account limits. Confirm restrictions and usage, but do not treat as a leaked private credential based on this code alone. |

## Findings by subsystem

### Frontend and rendering

- All major route views are lazy imports in `src/App.tsx`; this is a positive code-level design choice. The player route and anime fallback should be inspected separately in browser transfer traces.
- The global CSS and large optional chunks are the build-size items with direct measurements. No React Profiler session was available, so claims about unnecessary rerenders or memoization are not made.
- Image components commonly use native lazy loading. `HeroBanner` prioritizes the active backdrop, but has several eager items and large fixed blurred backgrounds; image request priority and decoded image memory were not measured.
- Reduced-motion preference is considered in `HeroBanner` autoplay and Lenis setup. No hydration issue applies to the current client-only root; no SSR path was found.

### Backend, database, and APIs

- There is no database layer to assess for indexes, query plans, N+1 database queries, transactions, or connection pools. Catalog APIs are third-party remote services invoked from the client.
- Resolver calls to HDHub and Pengu explicitly disable browser caching and add cache-busting timestamps even though each service keeps a ten-minute in-memory cache. This means only the app's own cache saves requests; browser/CDN cache cannot help. Whether this is necessary for freshness is a product/provider contract question, not a confirmed inefficiency.
- TMDB uses 15-minute memory/disk freshness and stale-while-revalidate for older entries. AniList details/rails persist without an explicit freshness check in the cache read path; this can reduce calls but can serve stale catalog data indefinitely until storage eviction/clear. This is a data freshness issue, not a demonstrated performance defect.
- Subtitle file downloads have no explicit response-size cap or request timeout. Large subtitle payloads could consume memory during `response.text()` and conversion; provider behavior/size distribution was not measured.

### Network, caching, and infrastructure

- `index.html` preconnects to several API/image domains and Google Fonts; no request-priority trace verifies whether each preconnect is useful on first route.
- Vercel config assigns one-year immutable cache headers to `/assets/*`. Nginx assigns one-year immutable caching to CSS/JS/font/wasm file names and 30 days to image assets. Nginx gzip is enabled at level 6. Actual response headers, Brotli, CDN cache hit rate, and static asset transfer were not tested against a deployment.
- Proxy uses public caching for media byte ranges (PERF-13); verify the Vercel/Cloudflare runtime behavior with range-specific cache tests before relying on it.
- Docker builds with Node 20 Alpine and runs Nginx with automatic worker processes, 1,024 connections per worker, gzip, and `/healthz`. No container image size, startup, CPU/memory limit, or production concurrency measurement was available.
- The repository has a `dist/` directory, but it was not assumed to correspond to current source. A fresh audit build was emitted outside the workspace.

### Security and reliability

- The most relevant performance-related risks are unbounded proxy access/egress, sequential multi-mirror timeout behavior, uncontrolled episode-count allocation, and missing client request cancellation/timeouts. These are scoped findings, not evidence of active abuse or an incident.
- Vercel CSP includes `unsafe-inline` and `unsafe-eval`; this is security hardening context, not a measured performance issue. No exploitation or security probing was performed.
- No database secrets, private user data, or environment values were read into the report. The built-in TMDB API key is omitted.

## Staged remediation roadmap

### Quick wins (after approval)

1. Capture a browser network trace for cold and warm home, movie, TV, anime, and playback routes on mobile and desktop profiles. Establish actual initial chunk closure, unique API request count, request sizes, and LCP/INP/CLS/TBT.
2. Add request timing and failure/timeout measurements for TMDB, AniList, subtitle, and resolver fetches, with redaction and no user data.
3. Validate intended Sentry DSN and production event delivery; instrument Web Vitals if RUM is desired.
4. Confirm byte-range cache behavior and current proxy traffic/egress metrics.

### Medium effort

1. Implement tested end-to-end timeout/cancellation behavior and bounded upstream proxy deadline.
2. Decide on one anime fallback data source after exercising API failure and deep-link paths.
3. Profile catalog route request fan-out and storage sweep cost before changing fetching or caching behavior.
4. Bound subtitle cache and episode materialization only with observed session/metadata evidence.

### Architectural work

1. Add an authenticated or quota-controlled media relay strategy if real traffic/abuse risk warrants it; preserve byte-range playback and direct-player compatibility.
2. Evaluate route-specific CSS extraction only after CSS coverage and screenshot regression tooling are available.
3. Define an observability baseline: real-user Web Vitals, service latency/error rate, proxy range/cache hit rates, and resource ceilings/alerts.

## Regression and verification plan for any later remediation

This audit did not run tests. Before implementing fixes, retain the current behavior as the baseline and run the existing `npm test`, `npm run test:e2e`, production build, and lint as appropriate. Add targeted tests for timeout/abort handling, mirror selection, 200/206/416 range semantics, cache eviction/freshness, subtitle URL/blob cleanup, and high episode counts. Use screenshot comparison and interactive manual checks on desktop/mobile to demonstrate no UI or workflow change. Measure cold/warm network traces and browser Performance traces on the same routes/devices before and after; report raw/gzip bytes and distributions rather than a single anecdotal run.

## Missing evidence required for a definitive production assessment

- Production and staging URLs plus permission to use browser profiling against them.
- RUM/Web Vitals distributions segmented by device/network/route.
- Browser network and CPU traces for cold/warm journeys and video start/seek.
- TMDB, AniList, subtitle, HDHub/Pengu, Vercel, and Cloudflare latency/error/quota metrics.
- Proxy request volume, egress bytes, cache hit ratio, range request behavior, and rate/abuse controls.
- Deployed cache/compression/security headers and resource limits.
- Confirmation whether the reported production DSN is overridden at deployment.
- User-traffic distribution identifying highest-traffic journeys.

## Approval boundary

This deliverable is an audit only. No remediation has been made. Once you approve remediation, changes should be implemented as separate, reviewable work and preserve current UI/UX, route behavior, freshness expectations, and byte-range playback contracts.
