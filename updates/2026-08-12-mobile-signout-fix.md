# Mobile sign-out reliability fix — 2026-08-12

## Fixed

- Made the sidebar **Sign out** action reliable on mobile browsers, including Mobile Safari.
- The mobile menu lock is now removed immediately when sign out is tapped so an off-canvas overlay cannot keep the authenticated UI stuck on screen.
- Persisted session credentials are cleared before navigation.
- Backend logout remains a non-blocking keepalive request.
- Reduced the hard-navigation fallback delay so cached or intercepted mobile UI state returns to the login screen promptly.

## Validation

- Extended the existing sign-out/mobile-scroll regression test to require mobile menu cleanup and the navigation fallback.
- No Google Apps Script changes are required for this fix.
