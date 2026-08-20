# Cohesive UIX system

## Summary

Refined the CGV Knowledge Academy interface so participant and administrator experiences share one clearer visual rhythm without changing Google Apps Script or application behavior.

## Visual changes

- Introduced one reusable spacing scale for page sections, grids, cards, and action groups.
- Standardized panel and card padding across participant, administrator, builder, result, and modal surfaces.
- Added a consistent typography ladder for page titles, section headings, hero headings, and repeating cards.
- Unified control height, font weight, horizontal padding, icon-button sizing, and input sizing.
- Aligned section headers and action groups so controls wrap predictably instead of creating page-specific spacing patterns.
- Improved course-card internal rhythm and footer alignment so cards in the same grid feel visually balanced.
- Normalized status pills, badges, metadata density, and navigation typography.
- Added a consistent visible focus treatment for keyboard navigation while preserving forced-colour support.
- Tightened mobile spacing and control density while retaining the existing touch-size safeguards and bottom navigation behavior.
- Preserved the established CGV dark, orange, amber, and red visual identity.

## Architecture

The changes stay inside `app/ui-foundation.css`, the existing canonical final UI layer. No additional visual override stylesheet was introduced.

## Google Apps Script

No Google Apps Script files were changed and no Apps Script deployment is required.

## Regression coverage

Added `tests/uix-cohesion.test.mjs` to protect the shared spacing tokens, typography hierarchy, card rhythm, control sizing, mobile density, focus visibility, reduced-motion behavior, and forced-colour fallback.
