import { and, eq, inArray } from "drizzle-orm";
import {
  getWeekStart,
  getWeekEnd,
  summarizeWeek,
  type WeekEmployeeSummary,
  type WeekStatus,
} from "@mini/shared";
import type { DB } from "./db/client.js";
import { employees, timeEntries, weekReviews } from "./db/schema.js";
import type { EmployeeRow } from "./db/schema.js";
import { notFound, employeeInactive, weekLocked } from "./errors.js";

export function getEmployeeOrThrow(db: DB, id: string): EmployeeRow {
  const row = db.select().from(employees).where(eq(employees.id, id)).get();
  if (!row) throw notFound();
  return row;
}

export function assertActive(employee: EmployeeRow): void {
  if (employee.deactivatedAt) throw employeeInactive();
}

/** Resolve the review status for an (employee, week); absence === pending. */
export function getWeekStatus(
  db: DB,
  employeeId: string,
  weekStart: string,
): { status: WeekStatus; reviewedAt: string | null } {
  const review = db
    .select()
    .from(weekReviews)
    .where(
      and(
        eq(weekReviews.employeeId, employeeId),
        eq(weekReviews.weekStart, weekStart),
      ),
    )
    .get();
  return review
    ? { status: review.status, reviewedAt: review.reviewedAt }
    : { status: "pending", reviewedAt: null };
}

/** Throw WEEK_LOCKED if the employee's week containing `date` is approved. */
export function assertWeekNotLocked(
  db: DB,
  employeeId: string,
  date: string,
): void {
  const { status } = getWeekStatus(db, employeeId, getWeekStart(date));
  if (status === "approved") throw weekLocked();
}

/** Build per-employee weekly summaries (hours, overtime, pay, review status). */
export function buildWeekSummary(
  db: DB,
  weekStart: string,
  includeInactive: boolean,
): WeekEmployeeSummary[] {
  const weekEnd = getWeekEnd(weekStart);

  const roster = db.select().from(employees).all();
  const visible = roster.filter((e) => includeInactive || !e.deactivatedAt);
  if (visible.length === 0) return [];

  const ids = visible.map((e) => e.id);
  const entries = db
    .select()
    .from(timeEntries)
    .where(inArray(timeEntries.employeeId, ids))
    .all()
    .filter((e) => e.date >= weekStart && e.date <= weekEnd);

  const reviews = db
    .select()
    .from(weekReviews)
    .where(eq(weekReviews.weekStart, weekStart))
    .all();
  const reviewByEmployee = new Map(reviews.map((r) => [r.employeeId, r]));

  return visible.map((emp) => {
    const hours = entries
      .filter((e) => e.employeeId === emp.id)
      .map((e) => e.hours);
    const pay = summarizeWeek(hours, emp.hourlyRateCents);
    const review = reviewByEmployee.get(emp.id);
    const status: WeekStatus = review?.status ?? "pending";

    return {
      ...pay,
      employeeId: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      hourlyRate: emp.hourlyRateCents / 100,
      weekStart,
      weekEnd,
      status,
      reviewedAt: review?.reviewedAt ?? null,
      locked: status === "approved",
    };
  });
}
