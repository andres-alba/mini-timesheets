# Mini Timesheets — Implementation Plan

A timesheet tracker: roster hourly employees, log daily hours, review each
employee's week with overtime (>40h/week at 1.5×), and an approval flow that
locks an approved week's entries.

This document is the implementation plan: the contract to build against, the
architecture decisions and their justifications, and the build order.

---

## 1. Goals & scope

**Must support**

- Manage employees: create, edit, deactivate/reactivate, list.
- Log time: per-employee daily hours; create, edit, delete.
- Weekly review: per-employee weekly summary (regular vs overtime hours + pay),
  approve/reject, and lock entries once approved.

**Explicit non-goals (out of scope)**

- Authentication / multiple reviewers (single implicit reviewer).
- Real payroll export, scheduling, or notifications.
- Multi-currency (USD only).

**Hard rules to encode**

- Overtime: hours beyond 40 in a single week are paid at 1.5×. Hours never
  combine across weeks.
- Money is exact to the cent — no floating-point drift in stored or displayed
  totals.
- An approved week is locked: its entries cannot be created, edited, deleted, or
  moved into it. Rejecting re-opens it.
- Deactivation is a soft delete — history is preserved.

---

## 2. Architecture

Monorepo, pnpm workspaces:

```
apps/
  api/     Hono + Drizzle + Zod over SQLite — REST API, error envelope, en/es i18n
  web/     Vite + React + TanStack Router + React Query + Tailwind — 3 screens
packages/
  shared/  Headless: types, Zod schemas, overtime/pay calc, week helpers, API client
```

**Key decisions and why**

- **Hono + Drizzle** — preferred stack; tiny and fully typed. Hono's
  `app.request()` makes integration tests trivial without a live socket.
- **SQLite over Postgres** — no Docker needed; a file-based DB makes the project
  run for a reviewer with zero setup. The Drizzle schema ports to Postgres with
  a dialect change.
- **Shared package is truly headless** — no React, no `window`, no framework
  code. It ships types, Zod schemas, the pay calc, date helpers, and a
  `fetch`-based API client (fetch injected). React Query *hooks* live in the web
  app and compose that client, so a future React Native client could reuse the
  client and schemas verbatim.
- **Validation defined once, enforced twice** — the same Zod schemas validate
  the client form and the API body. The time-entry schema is a factory
  (`timeEntryInputSchema({ today })`) because "no future date" depends on the
  current date; injecting `today` keeps it pure and testable on both sides.

---

## 3. Data model

Three tables. Money as integer cents; dates as `YYYY-MM-DD` text; timestamps as
ISO-8601 text.

- **employees** — `id`, `first_name`, `last_name`, `hourly_rate_cents` (int),
  `deactivated_at` (nullable; null = active), `created_at`.
- **time_entries** — `id`, `employee_id` (FK → employees), `date`, `hours`
  (real), `created_at`. Indexed by `employee_id` and by `(employee_id, date)`.
- **week_reviews** — `(employee_id, week_start)` composite PK, `status`
  (`approved` | `rejected`), `reviewed_at`.

**Modeling notes**

- **Approval as presence/absence of a row.** A week is `pending` when no
  `week_reviews` row exists, `approved`/`rejected` once one does. "Locked" is
  *derived*, not stored: a time-entry mutation computes the entry's week and is
  rejected if that week is approved.
- **Multiple entries per day are allowed** and summed (more flexible than one
  row per day). A unique constraint could be added later if required.
- **Weeks run Monday→Sunday**, identified by the Monday date. All date math
  parses `YYYY-MM-DD` as UTC so it never shifts across a timezone boundary.

---

## 4. The payroll calculation (single source of truth)

Lives in `packages/shared` so the API computes summaries with it and the client
only formats the result.

```
total     = round(sum of week's hours, 2 dp)   // absorb summation float drift
regular   = min(total, 40)
overtime  = max(0, total − 40)
pay       = round(regular × rate) + round(overtime × rate × 1.5)
```

Each pay component is rounded to the cent independently, then summed. Money is
integer cents end to end; dollars appear only at the wire boundary and in
display. Target: 45.5h @ $22.50 → `$900.00 + $185.63 = $1,085.63`.

---

## 5. API design

Base URL `/api`. JSON in, JSON out.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/employees?includeInactive=` | List (active-only by default) |
| POST | `/employees` | Create |
| PATCH | `/employees/:id` | Update |
| POST | `/employees/:id/deactivate` · `/reactivate` | Soft delete / restore |
| GET | `/employees/:id/time-entries` | List an employee's entries |
| POST | `/employees/:id/time-entries` | Log time |
| PATCH / DELETE | `/time-entries/:id` | Edit / delete |
| GET | `/weeks?week=YYYY-MM-DD&includeInactive=` | Per-employee weekly summary |
| POST | `/weeks/:week/employees/:id/review` | `{ action: "approve" \| "reject" }` |

**Error envelope** — every error returns a stable shape:

```jsonc
{ "error": { "code": "WEEK_LOCKED", "message": "…", "details?": [...] } }
```

Codes → status: `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `WEEK_LOCKED` 409,
`EMPLOYEE_INACTIVE` 422, `INTERNAL` 500. Routes throw a typed `AppError` with a
stable `code`; one central handler maps it to status + localized message, so
call sites carry no HTTP/i18n concerns. Validation errors include a `details`
array of `{ path, code }`.

**i18n** — `Accept-Language: es` returns Spanish messages; the `code` stays
constant so clients branch on it regardless of locale.

**Business-rule enforcement order** (time-entry create): employee exists (404)
→ employee active (422) → body valid (400) → week not locked (409) → insert.

---

## 6. Web client

Three screens, React Query for server state, forms validated through the shared
Zod schemas, Tailwind for styling. Every screen handles loading and error
states.

1. **Employees** — list (active-only by default + "Show inactive" toggle),
   create/edit in a modal, deactivate/reactivate.
2. **Time entries** — pick an employee, list/log/edit/delete entries. Locking is
   surfaced reactively (server returns `WEEK_LOCKED`, UI shows it).
3. **Weekly summary** — navigate weeks, per-employee regular vs overtime + pay
   breakdown, Approve/Reject; approved weeks show `(locked)`.

React Query hooks wrap each endpoint and invalidate the right query keys on
mutation (e.g. reviewing a week invalidates both the week and that employee's
entries).

---

## 7. Testing strategy

Tests are the spec made executable.

- **Shared (unit):** overtime/pay edge cases — exactly 40h, just over 40h,
  decimal-hour float drift, hours never combining across weeks; plus
  week-bucketing helpers.
- **API (integration), against a fresh in-memory SQLite db per test:** the
  approval flow locks create/edit/delete (409) and unlocks on reject;
  inactive-employee and validation rules; the weekly summary computed via the
  shared calc; the en/es error envelope.
- **Web (component):** the weekly summary card renders the overtime split and
  formatted pay, fires the review action, and hides actions once locked.

---

## 8. Build order

Bottom-up, so each layer's contract is settled before its consumers:

1. **`packages/shared`** — types, Zod schemas, money helpers, week helpers, pay
   calc + its unit tests. (The contract everything else depends on.)
2. **`apps/api`** — Drizzle schema + migration, db client, error envelope + i18n,
   services (employee/week helpers, lock check), routes, seed; integration tests.
3. **`apps/web`** — API client wiring, React Query hooks, the three screens and
   shared UI components; component test.
4. **Glue** — README with fresh-clone setup; `pnpm db:reset` / `dev` scripts;
   typecheck + test across the workspace.

---

## 9. Risks & trade-offs

- **Lock state on the Time-entries screen is reactive**, not pre-disabled, to
  avoid a per-week query there. Pre-fetching lock state per visible week would be
  the polish.
- **No auth / single reviewer** — `reviewed_at` is stored but no reviewer
  identity.
- **Float drift** — mitigated by integer cents + rounding hours to 2 dp before
  the calc; covered explicitly by tests.
- **Timezones** — all date parsing is UTC to keep week boundaries stable.
