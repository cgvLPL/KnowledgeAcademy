# Google Sheets backend

This folder turns a Google Spreadsheet into the CGV Exams database and
scoreboard.

## Set up

1. Create a blank Google Spreadsheet named **CGV Exams Data**.
2. Open **Extensions → Apps Script**.
3. Replace the default `Code.gs` with this folder's `Code.gs`.
4. In **Project Settings**, enable the manifest file and replace it with
   `appsscript.json`.
5. In **Project Settings → Script properties**, add:
   - `INITIAL_ADMIN_EMAIL`
   - `INITIAL_ADMIN_PASSWORD` (at least eight characters)
   - `INITIAL_ADMIN_NAME` (optional)
   - `INITIAL_ADMIN_BRANCH` (optional)
6. Run `setupEvaluationPlatform()` once and approve the requested spreadsheet
   permission.
7. Choose **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Copy the `/exec` deployment URL and set it as the hosted site's
   `GOOGLE_APPS_SCRIPT_URL` environment variable.

`setupEvaluationPlatform()` creates a clean workspace containing only the
administrator. To clean an existing workbook, run
`resetEvaluationPlatformToAdminOnly()` once. It removes every participant,
course, question, attempt, answer, and active session while preserving one
administrator.

The web app does not expose correct answers to participants. Passwords are
salted and hashed, session tokens are stored as hashes, results are calculated
server-side, and administrator actions require an administrator session.

## Workbook tabs

- `Dashboard` — evaluation selector, KPIs, participant leaderboard, and score
  distribution chart.
- `Users` — participant and administrator accounts.
- `Courses` — course metadata, schedule, status, time limit, and passing score.
- `Questions` — four-option question bank and correct-answer keys.
- `Attempts` — one row per started/submitted evaluation.
- `Answers` — participant answer audit trail.
- `Sessions` — expiring hashed login sessions.
- `Settings` — app-level configuration.

No cells are merged, so filtering, copying, and future automation remain safe.
