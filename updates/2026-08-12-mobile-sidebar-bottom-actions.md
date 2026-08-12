# Mobile sidebar bottom actions — 2026-08-12

## Fixed

- Restored reliable mobile taps for **Help centre**, **Settings**, and **Sign out** in the sidebar footer.
- The sidebar footer now stays above the fixed mobile top/bottom navigation while the drawer is open.
- Bottom sidebar controls explicitly retain pointer and touch handling on mobile.
- Tapping any sidebar-footer action now closes the actual React-owned mobile drawer/overlay state before the existing action continues.
- Prevented the fixed mobile navigation and top bar from intercepting taps while the drawer is open.

## Validation

- Added regression coverage for drawer-state cleanup, touch/pointer behavior, stacking order, and the three existing sidebar actions.
- No Google Apps Script change is required for this fix.
