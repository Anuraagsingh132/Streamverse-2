# Streamverse 2 — Comprehensive Security Audit Report

**Audit Date:** 2026-10-13  
**Auditor:** Agent 1 — Security Auditor  
**Target Codebase:** `frontend` (`c:\Users\anura\OneDrive\Documents\m\frontend`)  
**Scope:** Vercel Edge Proxies, Cloudflare Workers, API Services, Player Component Architecture, Subtitle Pipeline, Reverse Proxies (Vercel & Nginx), Client-Side Storage, and Supply Chain.

---

## Executive Summary

An exhaustive security audit was conducted on the Streamverse 2 frontend codebase. Streamverse 2 is a React 19 single-page application built with Vite and TypeScript, utilizing Edge functions (Vercel Edge Runtime) and Cloudflare Workers for video chunk proxying, and integrating with external media APIs (TMDB, AniList, OpenSubtitles, HDHub, Pengu).

### Key Vulnerability Distribution

| Severity | Count | Primary Areas |
|---|---|---|
| **CRITICAL** | 2 | Same-Origin Stored XSS via Edge Proxy, Unsandboxed Untrusted Iframes |
| **HIGH** | 5 | Multi-tenant CORS Bypass (Vercel & Cloudflare Workers), Hardcoded API Keys & Tokens, Nginx Header Override Dropping Security Headers, Weak CSP |
| **MEDIUM** | 2 | Upstream SSRF / Open Redirect in Video Proxies, URL Parameter Injection in Stream Embeds |
| **LOW** | 5 | WebVTT Single-pass Regex Sanitizer, AniList HTML Description Sanitization, Unbounded LocalStorage Writes, Unencrypted HTTP Stream URLs, Root Container Execution |
| **INFORMATIONAL** | 2 | Sentry CSP Telemetry Blocking, Dependency Supply Chain Baseline |

---

## Findings Matrix

---

### Finding ID: SEC-01
- **Category:** Security (Cross-Site Scripting / Content Injection)
- **Severity:** CRITICAL
- **Confidence:** HIGH
- **File:** `frontend/api/pixeldrain/[id].js`
- **Line/Function:** Lines 162–172 (`handler`)
- **Problem:** Arbitrary `Content-Type` forwarding combined with hardcoded `Content-Disposition: inline` allows Stored XSS in the primary application origin (`https://streamverse.app`). PixelDrain is a public file hosting service that allows users to upload arbitrary files including HTML and SVG. When requested through `/api/pixeldrain/:id`, the proxy blindly forwards `upstreamRes.headers.get('content-type')` without validating MIME types, serving HTML/SVG as inline active content under `streamverse.app`.
- **Evidence:**
```javascript
162: responseHeaders.set('Content-Disposition', 'inline');
163: responseHeaders.set('X-Content-Type-Options', 'nosniff');
...
166: const forwardableHeaders = ['content-type', 'content-length', 'content-range', 'last-modified', 'etag'];
167: for (const h of forwardableHeaders) {
168:   const v = upstreamRes.headers.get(h);
169:   if (v && !HOP_BY_HOP_HEADERS.has(h.toLowerCase())) {
170:     responseHeaders.set(h, v);
171:   }
172: }
```
- **Impact:** An attacker can upload an HTML/SVG file containing malicious JavaScript to PixelDrain and craft a link to `https://streamverse.app/api/pixeldrain/<evil-id>`. When opened by any user, the script executes within the `streamverse.app` origin, allowing full theft of `localStorage` data (watchlists, settings, history) and session hijacking.
- **Recommended Fix:** Enforce a strict whitelist of video and audio MIME types. Force `attachment` or reject non-media responses. Attach a sandboxing CSP header:
```javascript
const rawType = upstreamRes.headers.get('content-type') || '';
const ALLOWED_MIME = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime', 'audio/mp4', 'audio/mpeg', 'application/octet-stream'];
const isAllowedMedia = ALLOWED_MIME.some(m => rawType.toLowerCase().startsWith(m));

if (!isAllowedMedia) {
  responseHeaders.set('Content-Type', 'application/octet-stream');
  responseHeaders.set('Content-Disposition', `attachment; filename="${id}.bin"`);
} else {
  responseHeaders.set('Content-Type', rawType);
  responseHeaders.set('Content-Disposition', 'inline');
}
responseHeaders.set('Content-Security-Policy', "default-src 'none'; sandbox");
```
- **Effort:** LOW

---

### Finding ID: SEC-02
- **Category:** Security (Cross-Origin Resource Sharing / Authentication Bypass)
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `frontend/cloudflare-worker/worker.js` & `frontend/cloudflare-worker/wrangler.toml`
- **Line/Function:** `worker.js`: Lines 33–39 (`getAuthorizedOrigin`), `wrangler.toml`: Line 6
- **Problem:** The Cloudflare Worker configuration includes `workers.dev` in `ALLOWED_ORIGIN_PATTERNS`. Because any developer in the world can deploy a worker on `*.workers.dev`, the domain matching check `originHost.endsWith('.' + p)` treats any attacker-controlled Cloudflare Worker as a trusted origin, reflecting it in `Access-Control-Allow-Origin`.
- **Evidence:**
`frontend/cloudflare-worker/wrangler.toml`:
```toml
6: ALLOWED_ORIGIN_PATTERNS = "localhost,127.0.0.1,streamverse.app,streamverse.vercel.app,workers.dev"
```
`frontend/cloudflare-worker/worker.js`:
```javascript
33: const rawPatterns = env?.ALLOWED_ORIGIN_PATTERNS || 'localhost,127.0.0.1,streamverse.app,streamverse.vercel.app,workers.dev';
34: const allowedPatterns = rawPatterns.split(',');
35: for (const pattern of allowedPatterns) {
36:   const p = pattern.trim().toLowerCase();
37:   if (originHost === p || originHost.endsWith('.' + p)) {
38:     return origin;
39:   }
40: }
```
- **Impact:** An attacker hosting a site on `evil-app.workers.dev` can make cross-origin requests to the video proxy and read authenticated or proxied streams.
- **Recommended Fix:** Remove `workers.dev` and wildcard domains from `ALLOWED_ORIGIN_PATTERNS`. Pin explicit production domains:
```toml
ALLOWED_ORIGIN_PATTERNS = "localhost,127.0.0.1,streamverse.app,streamverse.vercel.app"
```
- **Effort:** LOW

---

### Finding ID: SEC-03
- **Category:** Security (Cross-Origin Resource Sharing / Insecure Hostname Validation)
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `frontend/api/pixeldrain/[id].js`
- **Line/Function:** Lines 27–31 (`getAuthorizedOrigin`)
- **Problem:** The origin validation checks `originHost.endsWith('vercel.app')` without a preceding period (`.`). This matches any registered domain ending with the literal substring `vercel.app` (e.g., `evilvercel.app`, `phishingvercel.app`). In addition, matching `*.vercel.app` permits any free arbitrary Vercel deployment by any third party to access the proxy.
- **Evidence:**
```javascript
26: if (
27:   allowed.some((host) => originHost === host || originHost.endsWith('.' + host)) ||
28:   originHost.endsWith('vercel.app')
29: ) {
30:   return origin;
31: }
```
- **Impact:** Any attacker registering a domain ending in `vercel.app` or deploying an app on Vercel can spoof the origin and bypass CORS controls.
- **Recommended Fix:** Require an explicit dot and pin the actual production Vercel project name:
```javascript
const allowedExact = new Set(['localhost', '127.0.0.1', 'streamverse.app', 'streamverse.vercel.app']);
if (allowedExact.has(originHost) || originHost.endsWith('.streamverse.app')) {
  return origin;
}
```
- **Effort:** LOW

---

### Finding ID: SEC-04
- **Category:** Security (Server-Side Request Forgery / Open Redirect)
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `frontend/api/pixeldrain/[id].js` line 133 & `frontend/cloudflare-worker/worker.js` line 135
- **Line/Function:** `handler` / `handleRequest`
- **Problem:** Both proxies invoke `fetch(targetUrl, { redirect: 'follow' })`. If an upstream mirror redirects to a cloud internal metadata IP (e.g. `http://169.254.169.254/latest/meta-data/`) or an internal network host, the Edge runtime will follow the redirect.
- **Evidence:**
`frontend/api/pixeldrain/[id].js`:
```javascript
130: const res = await fetch(targetUrl, {
131:   method: req.method === 'HEAD' ? 'HEAD' : 'GET',
132:   headers: upstreamHeaders,
133:   redirect: 'follow',
134:   signal: AbortSignal.timeout(10000)
135: });
```
- **Impact:** Potential SSRF against edge worker internal services or internal network infrastructure if upstream hosts issue redirect responses.
- **Recommended Fix:** Set `redirect: 'manual'` and inspect the `Location` header to ensure it strictly points to an allowed PixelDrain CDN host before following:
```javascript
redirect: 'manual'
```
- **Effort:** LOW

---

### Finding ID: SEC-05
- **Category:** Security (Hardcoded Secrets & Credential Exposure)
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `frontend/src/services/tmdb.ts` & `frontend/.env.example`
- **Line/Function:** `src/services/tmdb.ts`: Line 5, `frontend/.env.example`: Line 8
- **Problem:** A live TMDB production API key (`1cf50e6248dc270629e802686245c2c8`) is hardcoded as a fallback in source code. Because Vite embeds `VITE_*` environment variables directly into client-side JS bundles and queries TMDB directly from the browser (`?api_key=...`), any user or automated scraper can extract the key from production bundles or network inspection.
- **Evidence:**
`frontend/src/services/tmdb.ts`:
```typescript
5: export const TMDB_API_KEY = (import.meta.env?.VITE_TMDB_API_KEY as string) || '1cf50e6248dc270629e802686245c2c8';
```
`frontend/.env.example`:
```
5: # (Optional) TMDB API Key:
6: # If left blank or unset, Streamverse 2 automatically falls back to its built-in key.
8: VITE_TMDB_API_KEY=
```
- **Impact:** Quota depletion, account suspension, rate-limiting, and unauthorized usage of developer credentials.
- **Recommended Fix:** Remove the hardcoded API key from client code. Move TMDB API calls to a backend Edge API proxy (`/api/tmdb/*`), storing `TMDB_API_KEY` exclusively as a server-side environment secret without the `VITE_` prefix.
- **Effort:** MEDIUM

---

### Finding ID: SEC-06
- **Category:** Security (Hardcoded Authentication Token)
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `frontend/src/services/pengu.ts`
- **Line/Function:** Line 6
- **Problem:** An authentication token (`auth_token: QAgjPjVLyWOqIlIqXBXTjGamncIkhZZzliQBgU3x2zg`) is permanently hardcoded in the client-side resolver URL.
- **Evidence:**
```typescript
6: const PENGU_BASE_RESOLVER = 'https://pengu.uk/%7B%22auth_token%22%3A%22QAgjPjVLyWOqIlIqXBXTjGamncIkhZZzliQBgU3x2zg%22%7D/stream';
```
- **Impact:** The secret token is visible to anyone inspecting network traffic or the client bundle, allowing third-party abuse and token revocation.
- **Recommended Fix:** Proxy Pengu resolver requests via a serverless function and inject the token from server environment variables:
```typescript
// Move resolution to serverless route: /api/resolve/pengu
const PENGU_BASE_RESOLVER = '/api/resolve/pengu';
```
- **Effort:** LOW

---

### Finding ID: SEC-07
- **Category:** Security (Iframe Sandbox Missing / Clickjacking / Unrestricted Capabilities)
- **Severity:** CRITICAL
- **Confidence:** HIGH
- **File:** `frontend/src/components/CinemaOSPlayer.tsx`
- **Line/Function:** Lines 540–550
- **Problem:** The embedded iframe for third-party streaming providers (`megaplay.buzz`, `cinemaos.tech`, `vidsrc.to`, `player.autoembed.cc`) lacks the `sandbox` attribute entirely. Furthermore, the `allow` attribute grants permissions such as `clipboard-write` and `web-share` to untrusted external sites.
- **Evidence:**
```tsx
540: ) : embedUrl ? (
541:   <iframe
542:     key={embedUrl}
543:     src={embedUrl}
544:     title={item.title}
545:     className="absolute inset-0 w-full h-full border-0 bg-black"
546:     allowFullScreen
547:     scrolling="no"
548:     referrerPolicy="no-referrer"
549:     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
550:   />
```
- **Impact:** Third-party pirate/embed players frequently contain malicious ad networks, pop-unders, cryptocurrency miners, and forced top-level redirects (`top.location = ...`). Without `sandbox`, the third-party iframe can execute top-level navigation, redirect the victim to malware/phishing sites, spawn unconstrained windows, and access the clipboard.
- **Recommended Fix:** Apply a strict sandbox restricting top navigation and clipboard access:
```tsx
<iframe
  key={embedUrl}
  src={embedUrl}
  title={item.title}
  className="absolute inset-0 w-full h-full border-0 bg-black"
  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
  referrerPolicy="no-referrer"
/>
```
*(Notice omission of `allow-top-navigation`, `allow-top-navigation-by-user-activation`, and `allow-popups-to-escape-sandbox`)*.
- **Effort:** LOW

---

### Finding ID: SEC-08
- **Category:** Security (Parameter Injection / Unsanitized URL Interpolation)
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `frontend/src/components/CinemaOSPlayer.tsx` lines 36, 43, 52–54, 108–110, 120–122 & `frontend/src/services/hdhub.ts` lines 285–288
- **Line/Function:** `ANIME_SERVERS`, `MOVIE_TV_SERVERS`, `fetchHDHubStreams`
- **Problem:** Parameters (`id`, `tmdbId`, `season`, `episode`) sourced from route parameters (`/watch/anime/:id/:episode`) or external APIs are directly interpolated into provider URLs without `encodeURIComponent` or strict integer casting.
- **Evidence:**
`frontend/src/components/CinemaOSPlayer.tsx`:
```typescript
36: getUrl: (id, _isTV, _season, episode) => `https://megaplay.buzz/stream/ani/${id}/${episode}/sub`
...
54: return `https://cinemaos.tech/player/${tmdbId}/${season}/${episode}?theme=ffffff`;
...
110: return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
```
`frontend/src/services/hdhub.ts`:
```typescript
286: ? `${HDHUB_BASE_RESOLVER}/series/${imdbId}:${season}:${episode}.json`
```
- **Impact:** Malicious path characters (e.g. `/`, `?`, `#`, `..`) passed via deep links or forged route params can result in parameter tampering or path traversal on upstream embed servers.
- **Recommended Fix:** Ensure numeric validation or URI encoding:
```typescript
const cleanId = encodeURIComponent(String(id).replace(/[^a-zA-Z0-9_-]/g, ''));
const cleanSeason = Math.max(1, parseInt(String(season), 10) || 1);
const cleanEpisode = Math.max(1, parseInt(String(episode), 10) || 1);
```
- **Effort:** LOW

---

### Finding ID: SEC-09
- **Category:** Security (Weak Content Security Policy)
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `frontend/vercel.json`
- **Line/Function:** Line 37
- **Problem:** The CSP definition in `vercel.json` contains:
1. `'unsafe-inline'` and `'unsafe-eval'` in `script-src`: Completely defeats CSP protection against Cross-Site Scripting.
2. `http://localhost:*` in `media-src`: Allows unencrypted plain HTTP connections to arbitrary ports on the client's loopback interface.
3. `https://*.workers.dev` in `connect-src`: Permits connections to any Cloudflare worker hosted by any third party on the internet.
- **Evidence:**
```json
37: "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https: http://localhost:*; connect-src 'self' https://api.themoviedb.org https://*.themoviedb.org https://graphql.anilist.co https://*.anilist.co https://cinemaos.tech https://hdhub.thevolecitor.qzz.io https://*.qzz.io https://opensubtitles-v3.strem.io https://*.strem.io https://pengu.uk https://*.pengu.uk https://pengu.lol https://*.workers.dev https://pixeldrain.dev https://pixeldrain.com https://*.pixeldrain.eu.cc blob: data:; frame-src 'self' https://megaplay.buzz https://cinemaos.tech https://vidsrc.to https://player.autoembed.cc https://www.youtube.com https://youtube.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self';"
```
- **Impact:** Eliminates second-line defense against XSS; allows attackers with injected scripts to exfiltrate data to arbitrary `workers.dev` endpoints.
- **Recommended Fix:** Remove `'unsafe-eval'` and `http://localhost:*` from production CSP. Pin the specific Cloudflare Worker domain instead of the wildcard `*.workers.dev`:
```json
"media-src 'self' data: blob: https:; connect-src 'self' ... https://lively-bar-b4aa.anuraagsingh10a.workers.dev ...;"
```
- **Effort:** LOW

---

### Finding ID: SEC-10
- **Category:** Security (Nginx Security Header Override Bug & Missing CSP/HSTS)
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `frontend/nginx.conf`
- **Line/Function:** Lines 69–74, 83–88, 91–96, 99–103, 106–109
- **Problem:**
1. In Nginx, declaring `add_header` in a child `location` block completely overrides and disables all `add_header` directives from the parent `server` block. Because `location /` defines `add_header Cache-Control ...` (line 108), **NONE of the security headers** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are emitted on any SPA page request!
2. `nginx.conf` has **no Content-Security-Policy (CSP)** header.
3. `nginx.conf` has **no Strict-Transport-Security (HSTS)** header.
- **Evidence:**
```nginx
69: # Security Headers (Defeated by child location blocks!)
70: add_header X-Content-Type-Options "nosniff" always;
71: add_header X-Frame-Options "SAMEORIGIN" always;
72: add_header Referrer-Policy "strict-origin-when-cross-origin" always;
73: add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
...
106: location / {
107:     try_files $uri $uri/ /index.html;
108:     add_header Cache-Control "no-cache, no-store, must-revalidate";
109: }
```
- **Impact:** Production Docker containers running Nginx serve all HTML pages with zero security headers, rendering the application vulnerable to Clickjacking (`X-Frame-Options` missing), MIME confusion attacks, and missing transport encryption enforcement.
- **Recommended Fix:** Define a common security headers block or include file, or re-declare security headers inside each location block that has `add_header`:
```nginx
# Add CSP and HSTS, and include in location /:
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```
- **Effort:** LOW

---

### Finding ID: SEC-11
- **Category:** Security (Input Sanitization Bypass / WebVTT Parser)
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `frontend/src/services/subtitles.ts`
- **Line/Function:** Lines 94–109 (`sanitizeSubtitleText`)
- **Problem:** Tag stripping in `sanitizeSubtitleText` uses a single non-recursive regex replace. An interleaved tag such as `<sc<script>ript>` has its inner `<script>` stripped on the single pass, leaving `<script>` intact.
- **Evidence:**
```typescript
94: sanitized = sanitized.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/gi, (match, tagName, attrs) => {
95:   const lowerTag = tagName.toLowerCase();
96:   const allowedTags = ['b', 'i', 'u', 'c', 'v', 'lang'];
97:   if (!allowedTags.includes(lowerTag)) {
98:     return ''; // Strip forbidden tag completely
99:   }
```
- **Impact:** Low in HTML5 `<video><track>` because browser shadow DOM parses WebVTT inertly. However, if subtitle cue text is parsed or rendered in custom DOM elements in the future, script injection could occur.
- **Recommended Fix:** Run the tag sanitizer in a loop until no disallowed tags remain, or strip HTML entities using standard DOMParser:
```typescript
let prev;
do {
  prev = sanitized;
  sanitized = sanitized.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    const allowedTags = ['b', 'i', 'u', 'c', 'v', 'lang'];
    if (!allowedTags.includes(lowerTag)) return '';
    return match.startsWith('</') ? `</${lowerTag}>` : `<${lowerTag}>`;
  });
} while (sanitized !== prev);
```
- **Effort:** LOW

---

### Finding ID: SEC-12
- **Category:** Security (Incomplete HTML Sanitization in Data Models)
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `frontend/src/services/anilist.ts`
- **Line/Function:** Lines 280–285
- **Problem:** The AniList anime description cleaner only strips `<br>`, `<i>`, and `<b>` tags via an ad-hoc regex, leaving tags like `<img onerror=...>`, `<script>`, `<iframe src=...>` in the `cleanDesc` model property and persistent cache.
- **Evidence:**
```typescript
280: let cleanDesc = (media.description || '')
281:   .replace(/<br\s*\/?>/gi, '\n')
282:   .replace(/<i>|<\/i>|<b>|<\/b>/gi, '')
283:   .replace(/\n\n+/g, '\n\n')
284:   .trim();
```
- **Impact:** Low because React currently renders descriptions as text nodes, but creates a latent XSS sink if rendered with `dangerouslySetInnerHTML` in future components.
- **Recommended Fix:** Strip all HTML tags completely:
```typescript
let cleanDesc = (media.description || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/\n\n+/g, '\n\n')
  .trim();
```
- **Effort:** LOW

---

### Finding ID: SEC-13
- **Category:** Security (Client-Side Storage Management & Privacy)
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `frontend/src/store/useContinueWatchingStore.ts`, `frontend/src/store/useWatchlistStore.ts`, `frontend/src/utils/storageManager.ts`
- **Line/Function:** `useContinueWatchingStore.ts` line 65, `useWatchlistStore.ts` line 50
- **Problem:** Several stores write directly to `window.localStorage` bypassing `safeSetStorageItem`, which is responsible for LRU quota sweeps. Unmanaged growth in playback history can trigger unhandled `QuotaExceededError`. Furthermore, viewing history and user habits are stored in unencrypted plaintext in `localStorage`.
- **Evidence:**
`frontend/src/store/useContinueWatchingStore.ts`:
```typescript
65: window.localStorage.setItem(CONTINUE_WATCHING_STORAGE_KEY, JSON.stringify(toPersist));
```
- **Impact:** User viewing history is accessible to any script executing on the origin. Potential quota exhaustion in private browsing modes.
- **Recommended Fix:** Route all `localStorage` writes through `safeSetStorageItem` with an upper bound limit (e.g. max 50 entries).
- **Effort:** LOW

---

### Finding ID: SEC-14
- **Category:** Security (Observability Failure & DSN Misconfiguration)
- **Severity:** INFORMATIONAL
- **Confidence:** HIGH
- **File:** `frontend/src/utils/sentry.ts` & `frontend/vercel.json`
- **Line/Function:** `sentry.ts`: Lines 14–16, `vercel.json`: Line 37
- **Problem:** In production, Sentry initializes with a dummy placeholder DSN `https://placeholder@o0.ingest.sentry.io/0` if `VITE_SENTRY_DSN` is omitted. However, `vercel.json` CSP does not include `*.ingest.sentry.io` in `connect-src`. This causes CSP violation noise and silent failure of telemetry.
- **Evidence:**
```typescript
14: Sentry.init({
15:   dsn: dsn || (isProd ? 'https://placeholder@o0.ingest.sentry.io/0' : undefined),
16:   enabled: Boolean(dsn) || isProd,
```
- **Impact:** Broken error observability in production; CSP error logs filled with blocked telemetry requests.
- **Recommended Fix:** Only enable Sentry when `dsn` is explicitly defined, and add `https://*.ingest.sentry.io` to CSP `connect-src`.
- **Effort:** LOW

---

### Finding ID: SEC-15
- **Category:** Security (Container Security / Least Privilege)
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `frontend/Dockerfile`
- **Line/Function:** Lines 21–40
- **Problem:** The container runs Nginx as root (`UID 0`). The runner stage does not switch to a non-root user before executing `CMD ["nginx", "-g", "daemon off;"]`.
- **Evidence:**
```dockerfile
21: FROM nginx:alpine AS runner
...
40: CMD ["nginx", "-g", "daemon off;"]
```
- **Impact:** If a remote code execution vulnerability occurs in Nginx, the attacker gains root privileges inside the container.
- **Recommended Fix:** Switch to the official unprivileged image or drop privileges:
```dockerfile
FROM nginxinc/nginx-unprivileged:alpine AS runner
```
- **Effort:** LOW

---

### Finding ID: SEC-16
- **Category:** Security (Transport Security / Mixed Content)
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `frontend/src/services/hdhub.ts` & `frontend/src/services/pengu.ts`
- **Line/Function:** `hdhub.ts`: Line 317, `pengu.ts`: Line 183
- **Problem:** Stream URL filters only check `s.url.trim().startsWith('http')`, allowing unencrypted `http://` video URLs. Browsers will either block playback due to Mixed Content policies on HTTPS origins or stream video over plain text, exposing network traffic to eavesdropping and MITM tampering.
- **Evidence:**
```typescript
317: (s) => s && typeof s.url === 'string' && s.url.trim().startsWith('http')
```
- **Impact:** Mixed content playback failures or unencrypted stream transmission.
- **Recommended Fix:** Require `https://` or automatically upgrade `http://` URLs:
```typescript
(s) => s && typeof s.url === 'string' && s.url.trim().startsWith('https://')
```
- **Effort:** LOW

---

## Supply-Chain & Dependency Security Audit

A full audit of dependencies was performed via `npm audit`:
- **Production dependencies:** 27
- **Dev dependencies:** 174
- **Known vulnerabilities:** 0 (`auditReportVersion: 2`, `vulnerabilities: {}`)
- **Engine requirements:** Node `>=20.0.0`, npm `>=10.0.0`
- **Lockfile & Exact versioning:** `.npmrc` enforces `save-exact=true`, `package-lock=true`, `audit=true`. All 7 production dependencies (`@sentry/react`, `hls.js`, `lenis`, `lucide-react`, `motion`, `react`, `react-dom`, `react-router-dom`) are pinned to exact versions with no caret/tilde ranges.

CI/CD security in `.github/workflows/ci.yml`:
- Runs `npm audit --audit-level=high` on every push and PR.
- Uses pinned action versions (`actions/checkout@v4`, `actions/setup-node@v4`, `cloudflare/wrangler-action@v3`).

---

## Summary of Priority Remediations

1. **Immediate (P0):** Fix SEC-01 and SEC-07 by restricting MIME types to audio/video with `attachment` fallback on the PixelDrain proxy, and adding `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"` to `CinemaOSPlayer`'s `<iframe>`.
2. **High Priority (P1):** Fix SEC-02 and SEC-03 (restrict CORS origins to exact domains, remove `workers.dev` and un-dotted `vercel.app`), remove hardcoded secrets (SEC-05, SEC-06), and correct Nginx `add_header` inheritance (SEC-10).
3. **Defense-in-Depth (P2):** Tighten CSP in `vercel.json` (SEC-09), disable automatic redirect following on proxies (SEC-04), enforce HTTPS-only streams (SEC-16), and adopt non-root container execution (SEC-15).
