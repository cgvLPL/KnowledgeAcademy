<table align="center">
  <tr>
    <td bgcolor="#070809" align="center">
      <img src="public/brand/cgv-knowledge-academy.svg" alt="CGV Knowledge Academy" width="620">
    </td>
  </tr>
</table>

# CGV Knowledge Academy

CGV Knowledge Academy is an online learning and evaluation platform for quiz
courses, participant accounts, score history, certificates, live rankings, and
administrator-managed content.

> Focused learning. Cinematic energy.

## What is included

- Username-based participant and administrator sign-in workspaces
- Live, scheduled, completed, and draft evaluations with date-driven state changes
- Responsive one-question-at-a-time quiz flow with progress and results
- Personal score history for current and previous evaluations
- Administrator course and question builder
- Shared Knowledge Centre with admin-published lessons, imported text/Markdown notes, and resource links
- Participant account creation
- Per-evaluation live scoreboard
- Per-evaluation executive PDF reports with score distribution, participant
  results, and question-by-question answer analysis
- Google Sheets / Apps Script backend with server-side scoring
- Capacity safeguards and automated coverage for 30 simultaneous participants
- Fast sign-in, cached reads, and lightweight spreadsheet mutations
- Automatically generated spreadsheet dashboard, KPIs, leaderboard, and chart
- Responsive desktop and mobile layouts

## Repository structure

- `app/` — hosted web application and the server-side Sheets proxy
- `public/` — production visual assets
- `google-apps-script/` — Google Sheets database, authentication, scoring API,
  workbook setup, and dashboard generator
- `.env.example` — hosted environment variable template
- `.github/workflows/deploy-pages.yml` — automatic GitHub Pages deployment

## Live site

The GitHub Pages version is published at:

<https://rayhanmawuntu-stack.github.io/CGV.Exams/>

Every push to `main` rebuilds and redeploys the static frontend automatically.
The Pages build connects directly to the configured Apps Script Web App, while
the full-stack deployment uses the server-side Sheets proxy.

## Google Sheets connection

Follow [google-apps-script/README.md](google-apps-script/README.md) to create the
spreadsheet backend and deploy its Apps Script Web App. Set the resulting
`/exec` URL as `GOOGLE_APPS_SCRIPT_URL` in the hosted site.

The application does not contain offline or demo accounts. Authentication and
all evaluation data come from the connected spreadsheet.

## Clean initial workspace

The setup creates or preserves one username-based administrator and removes seeded content,
participants, attempts, answers, and sessions. Configure the initial
administrator through Apps Script Properties as described in
[google-apps-script/README.md](google-apps-script/README.md).

## Data model

The workbook uses separate tabs for settings, users, courses, lessons, questions,
attempts, answers, sessions, and the dashboard. Passwords are salted and
hashed, session tokens are stored as hashes, correct answers are never sent to
participants, and scores are calculated server-side.

## Participant capacity

The exam write path is designed and regression-tested for 30 participants
signing in, starting, and submitting in the same burst. Capacity-sensitive
requests are spread slightly and retried with bounded backoff, while the Apps
Script backend serializes spreadsheet writes with a 90-second lock queue and
keeps start and submission retries idempotent.

See [the 30-participant capacity audit](audit/concurrency-audit-2026-08-09.md)
for the verification boundary and the required Apps Script deployment step.

## Response performance

The branded opening screen is capped below one second, sign-in returns the
authenticated workspace in one backend response, and Apps Script reuses sheet
reads during each execution. Course changes update only the affected data rows;
the generated spreadsheet dashboard remains formula-driven and no longer needs
to be rebuilt after routine saves or deletes.

No worksheet cells are merged.
