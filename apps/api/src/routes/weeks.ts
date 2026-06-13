import { Hono } from "hono";
import {
  weekReviewSchema,
  weekQuerySchema,
  getWeekStart,
  getWeekEnd,
  isValidDateString,
  todayLocalISO,
  type WeekSummaryResponse,
} from "@mini/shared";
import type { AppEnv } from "../http.js";
import { parse } from "../http.js";
import { weekReviews } from "../db/schema.js";
import { validationError } from "../errors.js";
import { getEmployeeOrThrow, buildWeekSummary } from "../services.js";

export const weeksRoute = new Hono<AppEnv>();

/** GET /api/weeks?week=YYYY-MM-DD&includeInactive=true|false */
weeksRoute.get("/", (c) => {
  const q = parse(weekQuerySchema, {
    week: c.req.query("week"),
    includeInactive: c.req.query("includeInactive"),
  });
  const weekStart = getWeekStart(q.week ?? todayLocalISO());
  const body: WeekSummaryResponse = {
    weekStart,
    weekEnd: getWeekEnd(weekStart),
    employees: buildWeekSummary(c.var.db, weekStart, q.includeInactive),
  };
  return c.json(body);
});

/** POST /api/weeks/:week/employees/:employeeId/review  { action } */
weeksRoute.post("/:week/employees/:employeeId/review", async (c) => {
  const db = c.var.db;
  const weekParam = c.req.param("week");
  if (!isValidDateString(weekParam)) {
    throw validationError([{ path: "week", code: "date_invalid" }]);
  }
  const employeeId = c.req.param("employeeId");
  getEmployeeOrThrow(db, employeeId);

  const { action } = parse(weekReviewSchema, await c.req.json().catch(() => ({})));
  const weekStart = getWeekStart(weekParam);
  const status = action === "approve" ? "approved" : "rejected";
  const reviewedAt = new Date().toISOString();

  db.insert(weekReviews)
    .values({ employeeId, weekStart, status, reviewedAt })
    .onConflictDoUpdate({
      target: [weekReviews.employeeId, weekReviews.weekStart],
      set: { status, reviewedAt },
    })
    .run();

  // Return the refreshed summary row for this employee (includeInactive so a
  // review on an inactive employee's historical week still returns).
  const summary = buildWeekSummary(db, weekStart, true).find(
    (s) => s.employeeId === employeeId,
  );
  return c.json(summary);
});
