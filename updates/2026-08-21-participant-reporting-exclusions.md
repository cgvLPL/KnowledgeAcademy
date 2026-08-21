# Participant ranking and executive-report exclusions

Date: 2026-08-21

## Summary

- Add an administrator option on each participant account to exclude or re-include that participant in rankings and executive reports.
- Preserve the participant account, evaluation attempts, scores, certificates, and personal history when excluded.
- Persist reporting eligibility in the Google Sheets `Users` data through the new `excluded_from_reporting` field.
- Remove excluded participant attempts from the app scoreboard, ranking positions, course-level reporting averages, and scoreboard summary metrics.
- Remove excluded participant attempts and answers from executive-report participant lists, score distributions, pass-rate metrics, duration metrics, and question analytics.
- Keep the generated Google Sheets Dashboard ranking and KPI formulas aligned with the same exclusion rule.
- Invalidate cached dashboard/report reads immediately when reporting eligibility changes.
- Add regression coverage for persistence, ranking filtering, executive-report filtering, and the reversible admin control.

## Backend deployment note

This update changes `google-apps-script/Code.gs`. Deploy the updated Apps Script web app version after merge so the reporting exclusion is enforced in production.
