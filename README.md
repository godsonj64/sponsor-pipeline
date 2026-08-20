# Sponsor pipeline — web app

A browser front end for the UK sponsor-register pipeline: daily batches, persona
fit, live vacancies, and application tracking, over the same `sponsors.db` the
Python CLI and Flask UI already use.

Next.js (App Router) + TypeScript + Tailwind v4, sharing the design language of
the SonicAI site.

## Running it

```bash
npm install
npm run dev -- -p 3100
```

Open http://localhost:3100.

The database is found automatically at `../resumes/sponsors.db`. Point
`SPONSORS_DB` at it if your layout differs.

## Pages

| Page | Route | What it does |
| --- | --- | --- |
| Dashboard | `/` | Register totals, the seven-status funnel, persona and industry breakdowns, recent batches, activity feed |
| Daily batch | `/batch?date=YYYY-MM-DD` | The day's employers with a live detail panel: set status, edit role target, application URL and notes |
| Target pool | `/pool?persona=…` | Unworked sponsors ranked by persona fit; queue one, or take the top N onto a date |
| Live roles | `/roles?persona=…` | Vacancies found on career pages, scored against your personas |
| Follow-ups | `/followups?days=10` | Applications gone quiet, and drafts that stalled; change status inline |
| Search | `/search?q=…` | All 127k sponsors by display name or Companies House name |
| Sponsor | `/sponsor/:id` | Full record: Companies House, routes, persona fit, vacancies, group siblings, history |

## API

```
POST /api/status     { id, status }              set pipeline status
POST /api/field      { id, field, value }        edit a whitelisted pipeline field
POST /api/queue      { id, date, persona? }      add one employer to a batch date
POST /api/take       { n, persona, date }        queue the top N unworked targets
GET  /api/sponsor/:id                            full record as JSON
GET  /api/export?what=batch|applications|roles   CSV download
```

## Notes on the data

- **Shared database.** The Python CLI, the Flask UI and this app all write to the
  same file. Writes here take the lock up front (`BEGIN IMMEDIATE`) with a 15s
  busy timeout, matching `pipeline/ui.py`, so a running discovery job doesn't
  turn a click into a `SQLITE_BUSY` error.
- **Same queries.** `src/lib/queries.ts` mirrors the SQL in `pipeline/ui.py`, so
  both front ends report identical numbers.
- **Audit trail.** Status and field changes append to the `events` table the
  Python side also writes, so history stays in one place.
- **Status rules.** Setting `applied` stamps `applied_at`; moving back to
  `queued`/`researched`/`drafted` clears it, so the follow-up tracker never
  chases an application that was not actually sent.

## Not ported

The job runner (`/api/run` in the Flask UI, which shells out to `discover.py`,
`vacancies.py`, `reconcile.py` and `groups.py`) is deliberately not here — those
runs stay with the Python tooling. Use the CLI or the existing Flask UI on
port 8710 for discovery and vacancy pulls, then refresh this app to see results.

## Hosting

This reads SQLite from local disk, so it runs locally rather than on Vercel —
serverless has no persistent local file. Hosting it would mean moving
`sponsors.db` into Postgres first.
