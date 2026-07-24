# CGV Exams functional audit — 24 July 2026

## Verified automatically

The application was checked in GitHub Actions using Node.js 22 and a clean
`npm ci` installation.

- Google Apps Script JavaScript syntax: **PASS**
- Frontend/backend function contract tests: **PASS**
- Next.js production compilation and TypeScript validation: **PASS**
- GitHub Pages static export: **PASS**
- Corrected Google Sheets Dashboard pass-rate formula: **PASS**

Verification runs:

- `Verify application` run `30107644334`
- `Apply Dashboard formula fix` run `30107902765`
- Independent post-patch `Verify application` run `30107902753`

## Participant functions covered

- Administrator and participant workspace login validation
- Course availability and schedule checks
- Quiz start or resume for an unfinished attempt
- Real countdown timer and automatic timeout submission
- Question navigation and answer selection
- Exit confirmation
- Duplicate-submit prevention and three-attempt network retry
- Server-side scoring
- Idempotent result submission
- Writes to `Attempts` and `Answers`
- Result and score-history display
- Profile, history, export, search, navigation, and logout controls

## Administrator functions covered

- Dashboard, course, participant, and scoreboard loading
- Live result refresh
- Course creation and immediate publishing
- Course question persistence
- Course preview, edit, duplication, status changes, archive, and deletion
- Participant creation
- Additional administrator creation
- Account activation and deactivation
- Password reset
- Scoreboard selection, search, filtering, and CSV export
- Mobile navigation, notifications, account chip, help, settings, and logout

## Concurrent submission safeguards

- Short script locks are used only around write operations.
- Started attempts are reused instead of creating duplicate unfinished attempts.
- Submission retries return the stored result when an attempt was already saved.
- Answer rows are written in one batch.
- The attempt row is updated once and confirmed with `SpreadsheetApp.flush()`.
- The implementation is intended for approximately 20 simultaneous quiz
  participants within normal Google Apps Script quotas.

## Required live deployment step

The audited repository backend version is:

```text
2026.07.24-functional-audit
```

GitHub Pages cannot publish Google Apps Script versions. Copy the latest
`google-apps-script/Code.gs` into the Apps Script project, then select
**Deploy → Manage deployments → Edit → New version → Deploy**.

Open the existing `/exec` URL afterward and confirm its JSON response contains:

```json
"version":"2026.07.24-functional-audit"
```

Until the live endpoint reports that value, the deployed website can still be
connected to an older backend even though the repository source and static
frontend have passed verification.

## Scope limitation

The automated gate verifies source contracts, JavaScript syntax, TypeScript,
Next.js production compilation, and static export. A final authenticated smoke
test against the real spreadsheet requires the latest Apps Script deployment
and valid administrator and participant accounts; credentials are intentionally
not stored in the repository or audit workflow.
