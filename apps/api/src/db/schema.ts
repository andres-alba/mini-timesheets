import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

/**
 * SQLite schema. Money is stored as integer cents. Dates are `YYYY-MM-DD`
 * text; timestamps are ISO-8601 text. A soft delete is modeled as a nullable
 * `deactivated_at` timestamp rather than a row deletion.
 */

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  hourlyRateCents: integer("hourly_rate_cents").notNull(),
  deactivatedAt: text("deactivated_at"), // null === active
  createdAt: text("created_at").notNull(),
});

export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id),
    date: text("date").notNull(), // YYYY-MM-DD
    hours: real("hours").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    byEmployee: index("time_entries_employee_idx").on(t.employeeId),
    byEmployeeDate: index("time_entries_employee_date_idx").on(
      t.employeeId,
      t.date,
    ),
  }),
);

/**
 * A review only exists once an employee's week has been approved or rejected.
 * The absence of a row means the week is still `pending`. Composite key keeps
 * one review per (employee, week).
 */
export const weekReviews = sqliteTable(
  "week_reviews",
  {
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id),
    weekStart: text("week_start").notNull(), // Monday, YYYY-MM-DD
    status: text("status", { enum: ["approved", "rejected"] }).notNull(),
    reviewedAt: text("reviewed_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.employeeId, t.weekStart] }),
  }),
);

export type EmployeeRow = typeof employees.$inferSelect;
export type TimeEntryRow = typeof timeEntries.$inferSelect;
export type WeekReviewRow = typeof weekReviews.$inferSelect;
