# Accessibility Engineering Audit & Analysis (Agent 3)

**Application**: StreamVerse 2  
**Date**: October 2026  
**Status**: COMPLETE  
**Standard**: WCAG 2.1 Level AA Compliance  

---

## 1. Executive Summary

An automated and structural accessibility (a11y) audit was conducted using `@axe-core/playwright` engine (axe-core 4.14.0) alongside manual semantic DOM verification.

### Baseline Audit Results

| Metric | Measured Baseline | WCAG 2.1 AA Standard | Evaluation |
|---|---:|---:|:---:|
| **Axe Core Violations** | 2 serious violations (90 total nodes) | 0 violations | FAILING |
| **Axe Passes** | 42 rules passed | N/A | Good |
| **Incomplete Checks** | 1 check | 0 | Acceptable |
| **Critical Violations** | 0 | 0 | PASS |
| **Serious Violations** | 2 | 0 | FAIL |
| **Moderate Violations** | 0 | 0 | PASS |
| **Minor Violations** | 0 | 0 | PASS |

---

## 2. In-Depth Accessibility Violations Analysis

### A. Violation 1: `nested-interactive` (45 Affected Nodes)
- **WCAG Rule**: WCAG 2.1 Success Criterion 4.1.2 (Name, Role, Value)
- **Description**: *"Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies."*
- **Root Cause in `src/components/MediaCard.tsx`**:
  - The outer media card container is rendered as an interactive button element:
    ```tsx
    <div 
      role="button"
      tabIndex={0}
      aria-label={`View details for ${item.title}`}
      onClick={() => onOpenDetails(item)}
      ...
    >
    ```
  - Inside this container, nested interactive controls are rendered:
    - Line 71: `<motion.button type="button" aria-label="Add to watchlist" ...>`
    - Line 92: `<motion.button type="button" aria-label="Play title" ...>`
  - **Screen Reader Impact**: When a screen reader user focuses on the card, the accessibility tree encounters nested interactive controls within an active button role. JAWS, NVDA, and VoiceOver either fail to announce the nested buttons, announce them out of order, or misinterpret click events.

### B. Violation 2: `label-content-name-mismatch` (45 Affected Nodes)
- **WCAG Rule**: WCAG 2.1 Success Criterion 2.5.3 (Label in Name)
- **Description**: *"Ensure that elements labelled through their content must have their visible text as part of their accessible name."*
- **Root Cause in `src/components/MediaCard.tsx`**:
  - The container specifies: `aria-label={`View details for ${item.title}`}`.
  - The visible text within the container includes:
    ```tsx
    <h3 ...>{item.title}</h3>
    <span>SERIES</span> / <span>MOVIE</span>
    <span>{item.year}</span>
    <span>{item.vote_average}</span>
    ```
  - For speech input users (e.g., Dragon NaturallySpeaking, Voice Control), uttering the visible title fails to activate the control because the programmatic accessible name starts with "View details for" rather than the visible text string.

### C. Violation 3: Browser Keyboard & Context Menu Trapping (`securityDefense.ts`)
- **WCAG Guideline**: WCAG 2.1 Principle 2: Operable (Keyboard Accessible)
- **Impact**:
  - Disabling standard navigation keys (`F12`, `Ctrl+Shift+I`, `Ctrl+U`) and intercepting `contextmenu` events directly disrupts screen magnification tools, screen reader inspection palettes, and custom assistive input devices.
  - Users relying on right-click context menus for reading aids, browser translation, or spelling assistance are completely locked out.

### D. Focus Management & Outline Styles
- **Current State**:
  - `focus-visible:ring-2 focus-visible:ring-white/30` is implemented on several navigation buttons.
  - However, in modal sheets (`SearchModal.tsx`, `CinemaOSPlayer.tsx`), focus trapping requires verification to ensure focus is restored to the initiating trigger upon escape or close.

---

## 3. Remediation Plan

1. **Refactor `MediaCard.tsx` Interactive Hierarchy**:
   - Change the outer element from `role="button"` with `tabIndex={0}` to a semantic `<article>` or `<div>`.
   - Provide a dedicated, accessible title link or button for opening details:
     ```tsx
     <h3 ...>
       <button 
         type="button" 
         onClick={() => onOpenDetails(item)} 
         className="..."
       >
         {item.title}
       </button>
     </h3>
     ```
   - Keep the Play and Watchlist buttons as independent interactive siblings or within a structured card action bar.
   - This eliminates **both** `nested-interactive` and `label-content-name-mismatch` violations simultaneously across all 45 instances!
2. **Deactivate Disruptive Keyboard & Mouse Blockers**:
   - Retire the event interception in `securityDefense.ts`.
3. **Verify Focus Trapping in Modals**:
   - Confirm `useFocusTrap` activates properly when `SearchModal` opens and returns focus to the search trigger on close.
