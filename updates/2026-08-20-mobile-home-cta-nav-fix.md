# Mobile home CTA and navigation inset fix

## Summary

Fixed two phone-only UI issues visible on the participant home screen: the Start evaluation action alignment and the active bottom-navigation tile clipping against the outer navigation capsule.

## Changes

- Added explicit inner padding to the mobile navigation capsule so the active tile stays visibly inset from every outer edge.
- Switched the phone navigation layout to five equal-width grid slots to keep Home, Courses, Learn, History, and Profile balanced at narrow widths.
- Removed transforms from the active navigation state and preserved its glow without allowing it to collide with the parent pill.
- Added narrow-phone safeguards down to 320–340px widths.
- Rebalanced the Start evaluation CTA with a centered label and a separately positioned 44px arrow target on the right.
- Kept the CTA full width without allowing the arrow circle or text to crowd the card edge.
- Preserved forced-colour accessibility behavior.

## Regression coverage

Added `tests/mobile-home-cta-nav-fix.test.mjs` to protect the navigation inset, equal-width slot layout, active-tile radius, CTA sizing, arrow positioning, and stylesheet import order.

## Backend / Apps Script

No Google Apps Script files, request logic, backend data, evaluation behavior, or desktop layout were changed.
