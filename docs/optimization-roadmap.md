# Central Engineering Optimization Roadmap (Phase 4)

**Lead Engineer Review & Strategic Prioritization**  
**Date**: October 2026  
**Evaluation Formula**:  
$$\text{Priority Score} = \frac{\text{Impact} \times \text{Confidence} \times \text{Safety}}{\text{Effort}}$$  
*(Scores rated 1–10 per factor; higher score indicates higher urgency)*

---

## Executive Prioritization Matrix

| ID | Title | Domain | Priority Score | Classification |
|---|---|:---:|:---:|:---:|
| **SEC-01** | Patch High-Severity Dependency CVEs (`undici`, `vite`) | Security | 72.0 | **P0 — Critical** |
| **QA-01** | Fix 4 Failing Playwright E2E User Journey Tests | QA | 64.0 | **P0 — Critical** |
| **SEC-02** | Decommission Intrusive Lockout & CPU Timers in `securityDefense.ts` | Security / Perf / A11y | 60.0 | **P0 — Critical** |
| **A11Y-01** | Fix 90 WCAG Violations on Media Cards (`nested-interactive`, `label-mismatch`) | Accessibility | 56.0 | **P1 — High** |
| **PERF-01** | Dynamic Lazy-Load Telemetry Bundles (Sentry 450 kB, PostHog 308 kB) | Performance | 54.0 | **P1 — High** |
| **SEO-01** | Add Semantic Primary `<h1>` to Homepage & Catalog Views | SEO | 48.0 | **P1 — High** |
| **PERF-02** | Resolve `[INEFFECTIVE_DYNAMIC_IMPORT]` for `mediaData.ts` & `analytics.ts` | Frontend / Perf | 45.0 | **P1 — High** |
| **SEO-02** | Inject Structured Data (Schema.org JSON-LD WebApplication) | SEO | 36.0 | **P2 — Medium** |
| **PERF-03** | Replace Eager Top-Level Route Imports with Intent-Based Prefetching | Performance | 32.0 | **P2 — Medium** |
| **CODE-01** | Fix Oxlint Warnings (Impure `Date.now()`, Set-State Cascades, Unused Imports) | Code Quality | 28.0 | **P2 — Medium** |
| **SEO-03** | Enhance Dynamic Sitemap with `<lastmod>` Timestamps | SEO | 24.0 | **P2 — Medium** |
| **DEV-01** | Integrate E2E & Performance Threshold Checks in CI Pipeline | DevOps | 20.0 | **P3 — Low** |

---

## Detailed Action Plans

### P0 — Critical

#### 1. SEC-01: Patch High-Severity Dependency CVEs (`undici`, `vite`)
- **Problem**: `npm audit` flags 2 high-severity vulnerabilities affecting `undici` (SRI bypass, EventSource unbounded memory DoS) and `vite` (cross-origin script execution, command injection).
- **Evidence**: `npm audit` exit code 1 with high severity warnings.
- **Root Cause**: Outdated lockfile resolutions for transitive `undici` and direct `vite@8.3.2`.
- **Proposed Solution**: Update `vite` to `^8.3.5` and update `undici` to secure patch release.
- **Expected Improvement**: Clean security audit (0 high/critical vulnerabilities).
- **Risk**: Very low (minor patch updates within semver compatibility).
- **Files Affected**: `package.json`, `package-lock.json`.
- **Testing Required**: `npm audit`, `npm test`, `npm run build`.

#### 2. QA-01: Fix Failing Playwright E2E User Journey Tests
- **Problem**: 4 out of 5 E2E tests in `user-journey.spec.ts` fail.
- **Evidence**: `npx playwright test` fails with strict mode violations and hidden element locator mismatches.
- **Root Cause**:
  - Desktop `Navbar` and `MobileNav` both render `StreamVerse Home` links simultaneously.
  - Details and Watchlist pages render desktop and mobile action buttons simultaneously with CSS responsive classes (`hidden lg:flex` vs `flex lg:hidden`); `.first()` resolves to the hidden mobile button on desktop.
- **Proposed Solution**: Scope selectors by landmark role (`page.getByRole('banner')`) and add `.filter({ visible: true })` to interactive button locators.
- **Expected Improvement**: 100% passing E2E test suite (5 / 5 tests green).
- **Risk**: Zero risk to application runtime (test script improvement only).
- **Files Affected**: `e2e/user-journey.spec.ts`.
- **Testing Required**: `npx playwright test`.

#### 3. SEC-02: Decommission Intrusive Lockout & CPU Timers in `securityDefense.ts`
- **Problem**: `securityDefense.ts` registers 3 high-frequency `setInterval` loops (600ms, 800ms, 1000ms), hijacks `console`, intercepts keyboard shortcuts, and wipes `document.body` on timing deltas.
- **Evidence**: Breaks accessibility assistive tools, risks false-positive lockouts on slow mobile devices during garbage collection, burns battery/CPU.
- **Root Cause**: Well-intentioned but counterproductive client-side anti-tampering deterrent.
- **Proposed Solution**: Replace intrusive blocking and timer intervals with a benign lightweight notice; allow users normal keyboard/mouse accessibility.
- **Expected Improvement**: Eliminates CPU background churn, eliminates INP stutter, restores full keyboard accessibility.
- **Risk**: Low (features and streaming remain completely unaffected).
- **Files Affected**: `src/utils/securityDefense.ts`.
- **Testing Required**: Manual interaction, axe audit, component tests.

---

### P1 — High

#### 4. A11Y-01: Fix 90 WCAG Violations on Media Cards
- **Problem**: Axe scan reports 2 serious violations on the homepage affecting 90 total DOM nodes:
  - `nested-interactive`: 45 nodes
  - `label-content-name-mismatch`: 45 nodes
- **Evidence**: `baseline-audit-result.json` axe results.
- **Root Cause**: `MediaCard.tsx` renders the outer container as `<div role="button" tabIndex={0} aria-label="...">` containing nested `<motion.button>` elements for Play and Watchlist.
- **Proposed Solution**:
  - Refactor outer card container from `role="button"` to a semantic `<article>` or `<div>`.
  - Provide a dedicated, accessible title button or link for opening details.
  - Retain independent Play and Watchlist buttons at the card level without role nesting.
- **Expected Improvement**: 0 Axe accessibility violations on media rails; 100% WCAG 2.1 AA compliance for cards.
- **Risk**: Low (visual appearance preserved, accessibility enhanced).
- **Files Affected**: `src/components/MediaCard.tsx`.
- **Testing Required**: `npx tsx scripts/audit-baseline.ts`, `npm test`.

#### 5. PERF-01: Dynamic Lazy-Load Telemetry Bundles (Sentry & PostHog)
- **Problem**: `@sentry/react` (450 kB) and `posthog-js` (308 kB) add ~758 kB uncompressed (253 kB gzipped) of initial JavaScript before any media is rendered.
- **Evidence**: Rollup build output chunks `vendor-sentry` and `vendor-posthog` are imported in initial entry graphs because `src/main.tsx` statically imports `initSentry` and `initPostHog`.
- **Root Cause**: Static ES module imports in `src/main.tsx` and `src/App.tsx`.
- **Proposed Solution**:
  - Dynamically import `./utils/sentry` and `./services/analytics` inside `requestIdleCallback`.
  - Decouple static imports from `App.tsx` and stores.
- **Expected Improvement**: Immediate ~250 kB gzipped reduction in initial loaded bundle size; faster FCP and TBT.
- **Risk**: Low (error tracking and telemetry initialize seamlessly in idle state).
- **Files Affected**: `src/main.tsx`, `src/App.tsx`, `src/store/useWatchlistStore.ts`.
- **Testing Required**: `npm run build`, `npm test`.

#### 6. SEO-01: Add Semantic Primary `<h1>` to Homepage
- **Problem**: The homepage has zero `<h1>` heading elements.
- **Evidence**: Playwright DOM evaluation `document.querySelectorAll('h1').length === 0`.
- **Root Cause**: `HeroBanner.tsx` displays featured title using graphic styling without an `<h1>` element.
- **Proposed Solution**: Add an accessible `<h1>` to `HeroBanner.tsx` / `HomePage.tsx` with clean semantic typography.
- **Expected Improvement**: Eliminates critical SEO deficiency, improves search engine indexing.
- **Risk**: Zero (visual design preserved).
- **Files Affected**: `src/components/HeroBanner.tsx`.
- **Testing Required**: `audit-baseline.ts`.

#### 7. PERF-02: Resolve `[INEFFECTIVE_DYNAMIC_IMPORT]`
- **Problem**: Build produces Rollup warnings regarding `mediaData.ts` and `analytics.ts`.
- **Evidence**: Vite build log warnings `[INEFFECTIVE_DYNAMIC_IMPORT]`.
- **Root Cause**: Mixed static and dynamic imports of the same modules across different files.
- **Proposed Solution**: Align imports to prevent circular or conflicting chunk generation.
- **Expected Improvement**: Clean build output, optimal chunk boundary splitting.
- **Risk**: Low.
- **Files Affected**: `src/App.tsx`, `src/components/GenreRail.tsx`, etc.
- **Testing Required**: `npm run build`.

---

### P2 — Medium

#### 8. SEO-02: Inject Structured Data (Schema.org JSON-LD)
- **Problem**: Missing JSON-LD metadata for search engine rich snippets.
- **Proposed Solution**: Add structured `WebApplication` JSON-LD schema to `index.html` or `SEOHead.tsx`.
- **Files Affected**: `index.html` / `src/components/SEOHead.tsx`.

#### 9. PERF-03: Replace Eager Top-Level Route Imports
- **Problem**: `moviesPagePromise` and `tvShowsPagePromise` in `App.tsx` download route chunks immediately on homepage load.
- **Proposed Solution**: Use standard `React.lazy(() => import(...))` and prefetch on hover/focus.
- **Files Affected**: `src/App.tsx`.

#### 10. CODE-01: Fix Oxlint Diagnostics
- **Problem**: 43 warnings reported by `oxlint`.
- **Proposed Solution**: Clean unused imports, refactor impure `Date.now()` during render in `LiveSportsPage.tsx`, resolve set-state in effect warnings.
- **Files Affected**: `src/pages/LiveSportsPage.tsx`, `src/components/HDHubPlayer.tsx`, etc.

#### 11. SEO-03: Enhance Dynamic Sitemap Generator
- **Problem**: Sitemap lacks `<lastmod>` timestamps and change frequencies.
- **Proposed Solution**: Add ISO dates and `<changefreq>` tags in `scripts/generate-sitemap.ts`.
- **Files Affected**: `scripts/generate-sitemap.ts`.

---

### P3 — Low

#### 12. DEV-01: CI/CD Pipeline Verification
- **Problem**: E2E tests are not currently verified in the automated CI run.
- **Proposed Solution**: Update `.github/workflows/ci.yml` to include Playwright E2E once tests are green.
