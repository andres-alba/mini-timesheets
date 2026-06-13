# Mini Timesheets

A small timesheet tracker: roster hourly employees, log their daily hours, and
review each employee's week — with overtime (>40h/week at 1.5×) and an approval
flow that locks an approved week's entries.

Monorepo with three deliverables: a **Hono + Drizzle API**, a **headless shared
package** (types, Zod schemas, payroll math), and a **React web client**.

```
mini-timesheets/
├── apps/
│   ├── api/        Hono + Drizzle (SQLite) + Zod — REST API, error envelope, en/es i18n
│   └── web/        Vite + React + TanStack Router + React Query + Tailwind — 3 screens
└── packages/
    └── shared/     Headless: types, Zod schemas, overtime/pay calc, week helpers, API client
```

---

## Quick start

**Requirements:** Node ≥ 20 and pnpm (`corepack enable` if you don't have it).
No Docker needed — the database is SQLite.

```bash
pnpm install            # installs deps; postinstall builds @mini/shared
pnpm db:reset           # create the SQLite schema + load demo data (mirrors the sketch)
pnpm dev                # API on :3001, web on :5173 (Vite proxies /api → :3001)
```

Open **http://localhost:5173**. The seed reproduces the design sketch: Jane Doe
(45.5h → 5.5h overtime, pending), John Smith (32h, approved & locked), and Ana
García (inactive, with historical entries).

> The seed treats "today" as **2026-06-12**, so the demo week (Jun 08–14 2026)
> is the one to open on the Weekly summary screen.

### Useful scripts (run from the repo root)

| Command | What it does |
| --- | --- |
| `pnpm test` | Run every package's tests (28 total) |
| `pnpm typecheck` | Type-check all packages |
| `pnpm build` | Build the shared package (and you can `pnpm --filter @mini/web build`) |
| `pnpm db:reset` | Drop, re-migrate, and reseed the SQLite db |
| `pnpm db:migrate` / `pnpm db:seed` | Run individually |
| `pnpm dev:api` / `pnpm dev:web` | Run one app |

Config via env: `DATABASE_URL` (default `apps/api/data/timesheets.db`),
`PORT` (API, default `3001`), `VITE_API_URL` (web proxy target).

---

## How it works

### The three screens

1. **Employees** — list (active-only by default, "Show inactive" toggle),
   create/edit in a modal, deactivate/reactivate. Deactivation is a **soft
   delete** (`deactivatedAt` timestamp); history is preserved.
2. **Time entries** — pick an employee, see their entries, log/edit/delete.
   The form validates with the shared schema; the server enforces the same
   rules plus business rules (active employee, not a locked week).
3. **Weekly summary** — navigate weeks, see each employee's regular vs overtime
   hours and pay breakdown, and **Approve/Reject**. Approved weeks show
   `(locked)` and their entries can no longer be edited.

### The payroll calculation (the important bit)

All overtime/pay math lives in [`packages/shared/src/calc.ts`](packages/shared/src/calc.ts)
and is the single source of truth — the API computes summaries with it and the
client only formats the results. It is covered by unit tests including the
required edge cases (exactly 40h, just over 40h, decimal-hour float drift, and
that hours **never combine across weeks**).

```
regular   = min(totalHours, 40)
overtime  = max(0, totalHours − 40)
pay       = round(regular × rate) + round(overtime × rate × 1.5)   // each component rounded to the cent
```

Money is handled as **integer cents** end to end to avoid floating-point drift;
dollars appear only at the wire boundary and in display formatting. This matches
the sketch exactly: 45.5h @ $22.50 → `$900.00 + $185.63 = $1,085.63`.

### API

Base URL `/api`. JSON in, JSON out.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/employees?includeInactive=` | List employees |
| `POST` | `/employees` | Create |
| `PATCH` | `/employees/:id` | Update |
| `POST` | `/employees/:id/deactivate` · `/reactivate` | Soft delete / restore |
| `GET` | `/employees/:id/time-entries` | List an employee's entries |
| `POST` | `/employees/:id/time-entries` | Log time |
| `PATCH` / `DELETE` | `/time-entries/:id` | Edit / delete an entry |
| `GET` | `/weeks?week=YYYY-MM-DD&includeInactive=` | Per-employee weekly summary |
| `POST` | `/weeks/:week/employees/:id/review` | `{ "action": "approve" \| "reject" }` |

**Error envelope.** Every error returns a stable shape with a machine-readable
`code`, an HTTP status, and a localized, user-safe `message`:

```jsonc
{ "error": { "code": "WEEK_LOCKED", "message": "This week has been approved and is locked from editing." } }
```

Codes: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `WEEK_LOCKED` (409),
`EMPLOYEE_INACTIVE` (422), `INTERNAL` (500). Validation errors include a
`details` array of `{ path, code }` field issues.

**i18n.** Send `Accept-Language: es` and messages come back in Spanish; the
`code` stays constant so clients can branch on it regardless of locale. The web
client forwards the browser's language automatically.

```bash
curl -H 'accept-language: es' -X POST localhost:3001/api/employees/emp_jane/time-entries \
  -H 'content-type: application/json' -d '{"date":"2999-01-01","hours":8}'
# → {"error":{"code":"VALIDATION_ERROR","message":"Los datos enviados no son válidos.", ...}}
```

---

## Testing

```bash
pnpm test     # 28 tests
```

- **Shared (unit, 17):** overtime/pay calc edge cases + week-bucketing helpers.
- **API (integration, 7):** the approval flow locks edits/deletes/new entries
  (409) and unlocks on reject; inactive-employee and validation rules; the
  weekly summary computed via the shared calc; and the en/es error envelope.
  Each test runs against a fresh in-memory SQLite database.
- **Web (component, 4, bonus):** `WeekSummaryCard` renders the overtime split and
  formatted pay, fires the review action, and hides actions once locked.

---

## Design decisions & justifications

**Hono + Drizzle + SQLite.** Hono and Drizzle were the preferred stack and a
good fit — tiny, fully typed, and Hono's `app.request()` makes integration tests
trivial without a live socket. I chose **SQLite over Postgres** because Docker
isn't required for the exercise and a file-based DB makes the project run for a
reviewer with zero setup; the Drizzle schema would port to Postgres with only a
dialect change.

**Shared package is truly headless.** The brief said "no framework code," which
rules React out of `packages/shared`. So the package ships types, Zod schemas,
the payroll calc, date helpers, and a **framework-agnostic `fetch`-based API
client** (fetch is injectable, no `window`). The React Query *hooks* live in the
web app and compose that client — which means a future React Native app could
reuse the exact same client and schemas. The only concession is enabling the DOM
*lib* for type-checking `fetch`/`Headers` (available in both Node 18+ and
browsers); nothing in the package touches the DOM at runtime.

**Validation defined once, enforced twice.** The same Zod schemas validate the
client form and the API request body. The time-entry schema is a small factory
(`timeEntryInputSchema({ today })`) because the "no future date" rule depends on
the current date — injecting `today` keeps it pure and testable on both sides.

**Money as integer cents; each pay component rounded then summed.** Avoids float
drift and reproduces the sketch's `$900.00 + $185.63 = $1,085.63` precisely.

**Weeks run Monday→Sunday**, identified by the Monday date, to match the sketch
("Jun 08 – Jun 14"). All date math parses `YYYY-MM-DD` as UTC so it never shifts
across a timezone boundary.

**Approval modeled as the absence/presence of a review row.** A week is
`pending` when no `week_reviews` row exists, and `approved`/`rejected` once one
does. Locking is derived: a time-entry mutation computes the entry's week and is
rejected with `WEEK_LOCKED` if that week is approved — checked on create, edit,
*and* on moving an entry into another locked week. Rejecting re-opens the week.

### Trade-offs / what I'd do next with more time

- **Locking is surfaced reactively on the Time-entries screen** (the server
  returns `WEEK_LOCKED` and the UI shows it) rather than pre-disabling buttons,
  to avoid an extra per-week query there. The Weekly summary screen shows lock
  state directly. Pre-fetching lock state per visible week would be the polish.
- **No auth / single reviewer.** Out of scope; `reviewedAt` is stored but not a
  reviewer identity.
- **Multiple entries per day are allowed** and summed (more flexible than the
  one-row-per-day sketch); a unique constraint could be added if desired.
- Field-level validation `details` are returned as stable codes (English-mapped
  in the client); fully localizing them is a small extension of the existing
  message map.

### Notes

- `apps/api/drizzle/` holds the committed migration; `pnpm db:migrate` applies it.
- The repo is git-initialized but not committed — left for you to review first.
