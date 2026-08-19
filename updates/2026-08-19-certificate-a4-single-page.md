# Certificate A4 single-page sizing

## Summary

- locked certificate printing to one physical A4 portrait sheet at 210mm × 297mm
- moved the printable certificate root out of normal print flow to prevent browser rounding from creating a phantom second page
- changed the print-only certificate composition to bounded grid rows so the main copy, completion details, and footer cannot push one another onto another page
- tightened print-only spacing while preserving the existing CGV certificate design and long-name sizing logic
- added regression coverage for A4 dimensions, import order, page-break protection, and bounded certificate sections

## Google Apps Script

No Google Apps Script changes are required. This update is frontend/print CSS only.
