# Security Engineering Audit & Analysis (Agent 2)

**Application**: StreamVerse 2  
**Date**: October 2026  
**Status**: COMPLETE  
**Auditor**: Application Security Engineering  

---

## 1. Executive Summary

A comprehensive, non-destructive security review was performed across dependencies, HTTP response headers, Content Security Policy (CSP), CORS, secrets exposure, cross-site scripting (XSS), cross-site request forgery (CSRF), and client-side anti-tampering implementations.

### Security Audit Findings Summary

| Category | Finding | Severity | Status |
|---|---|:---:|:---:|
| **Dependency Vulnerabilities** | `undici` 8.0.0-8.12.1 (SRI Bypass, EventSource DoS) | HIGH | Vulnerable |
| **Dependency Vulnerabilities** | `vite` 8.3.0-8.3.2 (Command Execution, Cross-Origin Script Execution) | HIGH | Vulnerable |
| **Content Security Policy** | `'unsafe-inline'` permitted in `script-src` and `style-src` | MEDIUM | Weakened |
| **API Secret Exposure** | TMDB API v3 Key hardcoded across client and worker source | MEDIUM | Publicly Visible |
| **Anti-Inspection Deterrent** | `securityDefense.ts` hijacking DOM, shortcuts, right click | MEDIUM | A11y & Stability Risk |
| **CORS Configuration** | Cloudflare Worker fallback to `*` for empty origins | LOW | As Designed for Video |
| **Source Maps** | Disabled in production (`sourcemap: false`) | PASS | Secure |
| **Cookies** | Application does not set sensitive unflagged cookies | PASS | Secure |

---

## 2. In-Depth Vulnerability Analysis

### A. High-Severity Dependency CVEs (`npm audit`)
1. **`undici` (8.0.0 - 8.12.1) - High Severity**:
   - **Advisories**:
     - GHSA-4qv8-2p9j-2685: Denial of Service via unbounded memory in the EventSource parser.
     - GHSA-f72v-6w45-q472: Subresource Integrity (SRI) bypass via non-lowercase algorithm tokens.
     - GHSA-xjj6-f33q-929c: Denial of Service via unhandled error on excessive content-encodings.
   - **Remediation**: Update `undici` to `>=8.13.0` via dependency resolution / `npm audit fix`.
2. **`vite` (8.3.0 - 8.3.2) - High Severity**:
   - **Advisories**:
     - GHSA-698v-4r3x-3vcv & GHSA-r825-w8mm-5pxw: Launch-editor CLI flag misinterpretation and argument escaping flaws on Windows.
     - GHSA-9jrq-w75r-8gcw: Cross-origin script execution through Vite custom middleware.
     - GHSA-rq7h-c2jc-7f22: Path traversal beyond `server.fs.allow`.
   - **Remediation**: Upgrade `vite` to `>=8.3.5`.

### B. Content Security Policy (CSP) Assessment
Inspecting `vercel.json` (line 102):
```text
default-src 'self';
script-src 'self' 'unsafe-inline' blob: https://do.featurebase.app https://*.featurebase.app https://featurebase.app https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://*.posthog.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://do.featurebase.app https://*.featurebase.app https://featurebase.app;
font-src 'self' https://fonts.gstatic.com https://do.featurebase.app https://*.featurebase.app https://featurebase.app data:;
img-src 'self' data: blob: https:;
media-src 'self' data: blob: https:;
connect-src 'self' ...
frame-src 'self' ...
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
```
- **Strengths**:
  - `object-src 'none'` prevents Flash/Java applet exploits.
  - `base-uri 'self'` prevents base tag hijacking.
  - `connect-src` and `frame-src` are explicitly allowlisted to streaming providers and CDNs.
- **Vulnerabilities**:
  - Presence of `'unsafe-inline'` in `script-src`: Enables reflected or stored XSS to execute injected scripts without nonce validation.
  - `img-src 'self' data: blob: https:` and `media-src 'self' data: blob: https:` allow any HTTPS origin for media. While necessary for decentralized video mirrors (Pixeldrain, Pengu, etc.), CSP connect-src should maintain tight boundaries.

### C. Hardcoded Secrets in Source
- `VITE_TMDB_API_KEY`: The key `'1cf50e6248dc270629e802686245c2c8'` is hardcoded in:
  - `src/services/tmdb.ts` (line 6)
  - `api/og.js` (line 5)
  - `cloudflare-worker/worker.js` (line 47)
- **Risk Evaluation**:
  - TMDB v3 API keys in client-side Single Page Applications are by definition client-exposed (since requests originate directly from the user's browser).
  - However, best practice is to load from environment variables (`process.env.TMDB_API_KEY` / `import.meta.env.VITE_TMDB_API_KEY`) and encourage users/deployers to provide their own via Vercel dashboard.

### D. Security Deterrent Risks (`src/utils/securityDefense.ts`)
The current anti-inspection implementation attempts to block DevTools and keyboard shortcuts:
- It overrides native browser APIs (`console.log`, `console.info`, etc.).
- It blocks `contextmenu` (right click) and keys `F12`, `Ctrl+Shift+I`, `Ctrl+U`, `Ctrl+S`.
- It executes a `setInterval` with a `debugger` timing check that erases the entire `document.body` if execution latency exceeds 100ms.
- **Security Reality**:
  - This offers **zero protection** against network interceptors, Puppeteer/Playwright headless scrapers, curl/fetch requests, or browser extensions.
  - It creates severe UX breakage, false positives on slower mobile hardware (where heavy Garbage Collection triggers >100ms pauses, causing false lockout), and breaks accessibility requirements for assistive technologies.

---

## 3. Prioritized Security Recommendations

1. **Patch High-Severity Vulnerabilities**:
   - Upgrade `vite` to `^8.3.5` and update `undici`.
2. **Harden Anti-Inspection Logic**:
   - Safely remove intrusive keyboard/right-click blockers from `securityDefense.ts` to restore accessibility compliance, prevent false-positive lockouts on slow mobile devices, and eliminate polling intervals.
3. **Refactor CSP Directives**:
   - Remove redundant host wildcard redundancies.
   - Enforce strict headers on static and dynamic routes.
4. **Environment Variable Sanitization**:
   - Ensure documentation clearly guides deployers on keeping production TMDB credentials private via Vercel and Cloudflare Worker environment variables.
