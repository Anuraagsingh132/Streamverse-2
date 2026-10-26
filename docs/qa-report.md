# Quality Assurance (QA) & Test Engineering Audit (Agent 7)

**Application**: StreamVerse 2  
**Date**: October 2026  
**Status**: COMPLETE  
**Auditor**: QA & Test Automation Engineering  

---

## 1. Executive Summary & Existing Test Suite Health

StreamVerse 2 maintains three levels of automated testing:
1. **Unit & Services Test Suite**: Node.js `tsx --test test/services-and-utils.test.ts`
   - **Result**: **30 / 30 tests passing** in 1.69 seconds.
   - **Coverage**: Tests TMDB data formatting, AniList title normalization, Wyzie SRT-to-VTT subtitle conversion, subtitle sanitization, PixelDrain route selection, LRU caching eviction, in-flight request deduplication, and storage managers.
2. **Component Testing Suite**: Vitest 5.0.3 + React Testing Library + JSDOM
   - **Result**: **19 / 19 tests passing** across 3 test files in 53 seconds.
   - **Coverage**: Tests `Navbar`, `LiveStreamCard`, `CinemaOSPlayer` mount, error recovery modal, and player controls.
3. **End-to-End User Journeys Suite**: Playwright 1.64.0 (`frontend/e2e/user-journey.spec.ts`)
   - **Result**: **1 passed, 4 failed** out of 5 tests.

---

## 2. In-Depth Root Cause Analysis of E2E Failures

Running `npx playwright test` executed 5 test scenarios on Chromium. 4 failed with the following diagnostics:

### Failure 1: Homepage Navigation Bar
- **Test**: `1. Homepage: renders hero banner, navigation bar, and media rails`
- **Error**:
  ```text
  Error: strict mode violation: getByRole('link', { name: 'Streamverse Home' }) resolved to 2 elements:
      1) <a href="/" title="StreamVerse Home" ...> in Navbar
      2) <a href="/" title="StreamVerse Home" ...> in MobileNav / Floating Dock
  ```
- **Root Cause**: Playwright's strict mode requires unique locators. The application renders both desktop `Navbar` and mobile dock `MobileNav` simultaneously in the DOM, creating duplicate links with the exact same accessible name.
- **Remediation**: Scope the locator to the desktop header (`page.getByRole('banner').getByRole('link', { name: 'StreamVerse Home' })`) or distinguish mobile vs desktop accessible labels.

### Failure 2: Details Page Action Buttons
- **Test**: `3. Details Page: renders media metadata, backdrop, and action triggers`
- **Error**:
  ```text
  Error: expect(locator).toBeVisible() failed
  Locator: locator('button:has-text("Play")').first()
  Expected: visible
  Received: hidden
  ```
- **Root Cause**:
  - The Details page renders two sets of action buttons: one for mobile layouts (`flex lg:hidden`) and one for desktop hero headers (`hidden lg:flex`).
  - `.first()` picks the mobile button in DOM order, which has CSS `hidden` under the 1280px desktop viewport!
- **Remediation**: Use responsive locators or filter by visible elements: `page.locator('button:has-text("Play")').filter({ visible: true }).first()`.

### Failure 3: Watchlist Persistence
- **Test**: `4. Watchlist Persistence: adds item, persists in localStorage, and reflects in Watchlist view`
- **Error**: Similar hidden element issue for mobile vs desktop watchlist toggle buttons.
- **Remediation**: Update test locator to filter by `{ visible: true }`.

### Failure 4: Playback Flow
- **Test**: `5. Playback Flow: launches video player and mounts playback interface`
- **Error**: Triggered the hidden mobile Play button, so the click was intercepted / skipped.
- **Remediation**: Click the visible Play button.

---

## 3. QA Regression Strategy

1. **Fix Existing E2E User Journey Locators**:
   - Update `frontend/e2e/user-journey.spec.ts` to properly account for responsive responsive visibility so the suite runs green (5 / 5 passing).
2. **Expand E2E Coverage**:
   - Add automated tests for:
     - Anime Hub navigation (`/anime`)
     - Live Sports and channels navigation (`/sports`)
     - Watchlist adding and removal
     - Settings route and preference toggles (`/settings`)
     - Keyboard navigation (`Escape` closes modals, `Ctrl+K` opens search)
3. **CI/CD Integration**:
   - Run `npm test` and `playwright test` on pull requests to prevent regressions.
