# CGV Exams

An online evaluation platform for quiz courses, participant accounts, score
history, live rankings, and administrator-managed content.

## What is included

- Participant and administrator sign-in workspaces
- Current, upcoming, completed, and draft evaluations
- Responsive one-question-at-a-time quiz flow with progress and results
- Personal score history for current and previous evaluations
- Administrator course and question builder
- Participant account creation
- Per-evaluation live scoreboard
- Google Sheets / Apps Script backend with server-side scoring
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

Until that variable is configured, the site automatically opens in interactive
demo mode using the prefilled participant and administrator credentials. Demo
mode is for visual and workflow review; connected mode authenticates against
the spreadsheet and records scores online.

## Temporary setup accounts

Running `setupEvaluationPlatform()` creates:

- Administrator: `admin@cgv.co.id` / `ChangeMe123!`
- Participant: `rayhan.ardhana@cgv.co.id` / `participant123`

Change the administrator password immediately after setup. New participant
accounts receive `Welcome123!` until an administrator resets the password.

## Data model

The workbook uses separate tabs for settings, users, courses, questions,
attempts, answers, sessions, and the dashboard. Passwords are salted and
hashed, session tokens are stored as hashes, correct answers are never sent to
participants, and scores are calculated server-side.

No worksheet cells are merged.
