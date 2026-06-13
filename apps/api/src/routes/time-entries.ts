import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  timeEntryInputSchema,
  timeEntryUpdateSchema,
  todayLocalISO,
} from "@mini/shared";
import type { AppEnv } from "../http.js";
import { parse } from "../http.js";
import { timeEntries } from "../db/schema.js";
import { toTimeEntry } from "../serialize.js";
import { notFound } from "../errors.js";
import {
  getEmployeeOrThrow,
  assertActive,
  assertWeekNotLocked,
} from "../services.js";

/**
 * Mounted at /api. Listing/creating live under an employee; editing/deleting
 * address a single entry by id.
 */
export const timeEntriesRoute = new Hono<AppEnv>();

timeEntriesRoute.get("/employees/:employeeId/time-entries", (c) => {
  const db = c.var.db;
  const employeeId = c.req.param("employeeId");
  getEmployeeOrThrow(db, employeeId); // 404 if no such employee
  const rows = db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.employeeId, employeeId))
    .all()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return c.json(rows.map(toTimeEntry));
});

timeEntriesRoute.post("/employees/:employeeId/time-entries", async (c) => {
  const db = c.var.db;
  const employeeId = c.req.param("employeeId");
  const employee = getEmployeeOrThrow(db, employeeId);
  assertActive(employee); // no entries for inactive employees
  const input = parse(
    timeEntryInputSchema({ today: todayLocalISO() }),
    await c.req.json().catch(() => ({})),
  );
  assertWeekNotLocked(db, employeeId, input.date);

  const row = {
    id: `te_${crypto.randomUUID()}`,
    employeeId,
    date: input.date,
    hours: input.hours,
    createdAt: new Date().toISOString(),
  };
  db.insert(timeEntries).values(row).run();
  return c.json(toTimeEntry(row), 201);
});

timeEntriesRoute.patch("/time-entries/:id", async (c) => {
  const db = c.var.db;
  const id = c.req.param("id");
  const entry = db.select().from(timeEntries).where(eq(timeEntries.id, id)).get();
  if (!entry) throw notFound();

  // Locked if the entry's current week is approved...
  assertWeekNotLocked(db, entry.employeeId, entry.date);
  const input = parse(
    timeEntryUpdateSchema({ today: todayLocalISO() }),
    await c.req.json().catch(() => ({})),
  );
  // ...and you may not move an entry into another locked week either.
  if (input.date) assertWeekNotLocked(db, entry.employeeId, input.date);

  const patch: Partial<typeof timeEntries.$inferInsert> = {};
  if (input.date !== undefined) patch.date = input.date;
  if (input.hours !== undefined) patch.hours = input.hours;
  if (Object.keys(patch).length > 0) {
    db.update(timeEntries).set(patch).where(eq(timeEntries.id, id)).run();
  }
  const updated = db.select().from(timeEntries).where(eq(timeEntries.id, id)).get()!;
  return c.json(toTimeEntry(updated));
});

timeEntriesRoute.delete("/time-entries/:id", (c) => {
  const db = c.var.db;
  const id = c.req.param("id");
  const entry = db.select().from(timeEntries).where(eq(timeEntries.id, id)).get();
  if (!entry) throw notFound();
  assertWeekNotLocked(db, entry.employeeId, entry.date);
  db.delete(timeEntries).where(eq(timeEntries.id, id)).run();
  return c.body(null, 204);
});
