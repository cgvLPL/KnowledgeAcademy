# iOS 26 Liquid Glass design, icons, and symbols

Date: 2026-11-08

## Summary

- Add `app/liquid-glass.css`, loaded last inside `@layer liquid-glass`.
  Important declarations in a cascade layer outrank the legacy unlayered
  `!important` rules regardless of specificity, so the layer wins predictably.
- Follow Apple's HIG Materials, Color, and "Adopting Liquid Glass" guidance:
  - Glass only on navigation and controls: the sidebar (floating inset), the
    capsule tab bar, bar controls, sheets, toasts. Regular glass by default,
    more opaque on large surfaces, and clear glass with a 35% dimming layer
    over PDF and certificate viewers.
  - Content (metric, course, table, and question cards) uses standard solid
    materials with no glass or backdrop blur.
  - Bars have no material of their own; a scroll edge effect blurs and fades
    the content passing beneath them.
  - Color only on the primary action (on its background) and on the current
    selection. The tint is #c93d0b, so white labels meet 4.5:1.
  - Capsule controls, segmented controls, and concentric corner radii.
  - Reduce Transparency, Increase Contrast, Reduce Motion, forced colors, and
    a no-`backdrop-filter` fallback.
- On phones, the full-screen sign-in card uses a thick standard material
  instead of glass, because the HIG says not to use glass for full-screen
  backgrounds.
- Redraw the app icon set from the original CGV vector with glass layers, a
  dark variant, and a monochrome variant. Home-screen icons are full-bleed so
  iOS applies its own mask. `favicon.svg` follows light and dark mode.
- Add filled, hierarchical navigation symbols for selected items
  (`app/symbols.tsx`). Apple's SF Symbols are licensed only for Apple-platform
  apps and cannot be used on the web.
- Standardize text alignment: leading for navigation, cards, headings, and
  questions; trailing with tabular figures for numeric columns; centered only
  for alerts, empty states, button labels, and the sign-in heading.
- Bump the icon cache revision so browsers and home screens pick up the
  new icons.

## Verification

The layer was rendered in headless Chromium against all 75 production
stylesheets for the admin dashboard, dialogs, the quiz, and sign-in at desktop
and phone sizes, and checked with computed-style assertions. Regression tests:
`tests/liquid-glass.test.mjs` and `tests/app-icons-symbols.test.mjs`.

No backend deployment is required for this part of the release.
