# React navigation interaction refactor — 2026-08-12

## Summary

The shared application navigation controls now use one React-owned interaction controller instead of several independent document/window click bridges.

## Changes

- Added `AppInteractionProvider` as the single source of truth for the mobile sidebar and Settings panel state.
- Coordinated Open menu, sidebar navigation, Help centre, Settings, and Sign out through one React capture boundary.
- Kept Sign out connected to the existing native application `onLogout` handler while clearing stale persisted session keys before the state transition.
- Preserved the mobile hard-navigation fallback for browsers that fail to render the logged-out state promptly.
- Moved Settings open/close state into the shared controller and added focus restoration when the dialog closes.
- Reduced `SessionScrollEnhancer` to viewport measurement only.
- Removed mobile-menu ownership and Help/Settings routing from the legacy `ButtonSafetyNet`.
- Removed the superseded `mobile-sidebar-bottom-actions.tsx` event bridge while retaining its stacking/touch CSS safeguards.
- Added real Playwright interaction tests against the production static build for mobile and desktop navigation, Settings, Help centre, sidebar navigation, and Sign out.
- Closed superseded draft PR #52 to keep the pull-request queue clean.

## Verification

GitHub Actions runs the existing type-check, lint, production build, Node regression suite, responsive visual suite, and the new Playwright interaction suite before merge.

## Google Apps Script

No Google Apps Script source or deployment changes are required for this update.
