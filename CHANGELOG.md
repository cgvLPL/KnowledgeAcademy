# Changelog

## 1.3.0 — Exam Integrity & Liquid Glass

Requires redeploying the Apps Script web app (`Code.gs` and `ZZLiveQuiz.gs`).

### Exam integrity

- Enforced quiz time limits and closing dates on the server. Each attempt now
  has a deadline (start time + time limit, or the closing date if earlier).
  `submitAttempt` accepts answers up to 120 seconds after the deadline;
  later submissions are closed with no answers and a score of 0.
- The quiz timer now counts down to the server deadline, so reloading or
  resuming an attempt no longer restarts the clock. A device with the wrong
  clock can no longer add or remove time.
- Abandoned attempts that are reopened after their deadline are closed and
  count toward the attempt limit, so they cannot be resumed with a fresh timer.
- Editing a quiz now keeps the IDs of its existing questions. Previously every
  save regenerated them, which scored in-progress attempts as 0 and showed past
  answers as "unanswered" in executive reports.

### Backend reliability

- Replaced three competing `doPost` definitions with a single router in
  `Code.gs`. Extension files register routes through `liveQuizApiRoutes_()`, so
  the order of files in the Apps Script editor no longer matters, and a missing
  extension disables only its own actions.
- Live-monitor heartbeats are stored in the Apps Script cache instead of the
  `LiveActivity` sheet and no longer take the script lock, so they don't queue
  in front of quiz submissions.
- Removed the unlocked, row-by-row `LiveActivity` cleanup that could overwrite
  or delete the wrong row. `setupLiveQuizMonitoring()` now only clears legacy
  rows, in one batch, under the script lock.

### Liquid Glass design (iOS 26)

- Added `app/liquid-glass.css`, a cascade-layered design layer that follows
  Apple's Liquid Glass guidance: glass only on navigation and controls (the
  floating sidebar, capsule tab bar, bar controls, sheets, toasts), standard
  solid materials for content cards, and clear glass with a dimming layer over
  PDFs and certificates.
- Bars now float their controls as glass over a scroll edge effect instead of
  a solid strip.
- Only the primary action is tinted. The tint is now #c93d0b, which gives white
  labels 5:1 contrast; the previous gradient measured 1.8–4.3:1.
- Capsule buttons, segmented filter tabs, concentric corner radii, and spring
  press feedback.
- Supports Reduce Transparency, Increase Contrast, Reduce Motion, Windows
  high-contrast mode, and browsers without `backdrop-filter`.
- Fixed a leftover lime-green dialog label and doubled input backgrounds on the
  sign-in form.
- Standardized text alignment across the app: navigation, cards, section
  headings, and quiz questions align to the leading edge; numeric table
  columns align trailing with tabular figures; centering is kept only for
  alerts, empty states, button labels, and the sign-in heading. Uses logical
  `start`/`end` so it stays correct for right-to-left text.
- Mobile segmented filters stay on one scrollable row instead of stacking into
  full-width buttons.

### Icons and symbols

- Redrew the app icon in the Liquid Glass style from the original CGV vector:
  a brand-gradient background with the CGV glyph and sparkle as glass layers,
  plus a dark variant and a monochrome variant.
- Fixed home-screen icons that had rounded corners baked in over black, which
  showed dark corner wedges after iOS applied its own mask, and a maskable
  icon that contained a nested rounded-square outline.
- `favicon.svg` now matches the app icon and follows the browser's light/dark
  preference. Added a `monochrome` manifest icon for themed icon contexts.
- Selected navigation items now show filled symbol variants with hierarchical
  layers (`app/symbols.tsx`); all other symbols use a consistent weight.
- Symbol tiles use a quiet tint instead of a saturated gradient, with only the
  lead metric emphasized.
- `scripts/render-app-icons.mjs` now generates SVG masters and PNGs through
  Chromium instead of the undeclared `sharp` package.
- Removed unused Next.js template icons (`file.svg`, `globe.svg`, `window.svg`).

### Fixes

- Restored the stylesheet order that the existing regression tests expect
  (shared dashboard spacing → People mobile layer → quiz builder layer). A
  later edit had moved imports out of that order, which made the pull-request
  check fail. Card and section gaps on dashboards follow the shared spacing
  system again.

### Testing

- Added behavioural backend tests that run the real Apps Script sources against
  an in-memory Sheets, Lock, Cache, and Properties runtime
  (`tests/support/apps-script-harness.mjs`).
- Added regression tests for the Liquid Glass layer, icons, and symbols.

## 1.2.0 — Live Quiz Monitoring

- Added the Admin Live Quiz Monitor to the existing overview.
- Added authenticated participant heartbeats every 15 seconds and Admin polling every 10 seconds.
- Added Active, Idle, Disconnected, and Completed status derivation from server timestamps.
- Added reconnect handling that reuses the same attempt activity row.
- Added search, status/evaluation/branch/position filters, clickable status counters, and sorting.
- Added current-question progress, answered count, session duration, relative activity time, and exact activity timestamps.
- Added server-side attempt ownership and course validation.
- Made total question counts server-owned instead of trusting heartbeat payloads.
- Added duplicate-heartbeat throttling and automatic stale activity pruning.
- Added migration-safe `LiveActivity` setup through `setupLiveQuizMonitoring()`.
- Added privacy regression coverage to prevent live monitoring from returning answers, question text, correct-answer keys, or pre-submission scores.
- Expanded responsive, Apps Script, lifecycle, status-boundary, and integration regression coverage.

## 1.1.2 — Productivity & Insights

- Added participant, course, scoreboard, and history filtering/export improvements.
- Added calendar exports for scheduled evaluations.
- Added performance trend visualization.
- Added the application update/version experience used by deployments.
