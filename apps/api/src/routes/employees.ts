import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  employeeInputSchema,
  employeeUpdateSchema,
  dollarsToCents,
} from "@mini/shared";
import type { AppEnv } from "../http.js";
import { parse } from "../http.js";
import { employees } from "../db/schema.js";
import { toEmployee } from "../serialize.js";
import { getEmployeeOrThrow } from "../services.js";

export const employeesRoute = new Hono<AppEnv>();

const byName = (a: { firstName: string; lastName: string }, b: typeof a) =>
  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);

/** List employees; active-only by default, all with ?includeInactive=true. */
employeesRoute.get("/", (c) => {
  const includeInactive = c.req.query("includeInactive") === "true";
  const rows = c.var.db.select().from(employees).all();
  const visible = (includeInactive ? rows : rows.filter((r) => !r.deactivatedAt))
    .sort(byName);
  return c.json(visible.map(toEmployee));
});

employeesRoute.get("/:id", (c) => {
  const row = getEmployeeOrThrow(c.var.db, c.req.param("id"));
  return c.json(toEmployee(row));
});

employeesRoute.post("/", async (c) => {
  const input = parse(employeeInputSchema, await c.req.json().catch(() => ({})));
  const row = {
    id: `emp_${crypto.randomUUID()}`,
    firstName: input.firstName,
    lastName: input.lastName,
    hourlyRateCents: dollarsToCents(input.hourlyRate),
    deactivatedAt: null,
    createdAt: new Date().toISOString(),
  };
  c.var.db.insert(employees).values(row).run();
  return c.json(toEmployee(row), 201);
});

employeesRoute.patch("/:id", async (c) => {
  const db = c.var.db;
  const id = c.req.param("id");
  getEmployeeOrThrow(db, id);
  const input = parse(employeeUpdateSchema, await c.req.json().catch(() => ({})));

  const patch: Partial<typeof employees.$inferInsert> = {};
  if (input.firstName !== undefined) patch.firstName = input.firstName;
  if (input.lastName !== undefined) patch.lastName = input.lastName;
  if (input.hourlyRate !== undefined) {
    patch.hourlyRateCents = dollarsToCents(input.hourlyRate);
  }
  if (Object.keys(patch).length > 0) {
    db.update(employees).set(patch).where(eq(employees.id, id)).run();
  }
  return c.json(toEmployee(getEmployeeOrThrow(db, id)));
});

/** Soft delete — stamp deactivatedAt rather than removing the row. */
employeesRoute.post("/:id/deactivate", (c) => {
  const db = c.var.db;
  const id = c.req.param("id");
  getEmployeeOrThrow(db, id);
  db.update(employees)
    .set({ deactivatedAt: new Date().toISOString() })
    .where(eq(employees.id, id))
    .run();
  return c.json(toEmployee(getEmployeeOrThrow(db, id)));
});

employeesRoute.post("/:id/reactivate", (c) => {
  const db = c.var.db;
  const id = c.req.param("id");
  getEmployeeOrThrow(db, id);
  db.update(employees)
    .set({ deactivatedAt: null })
    .where(eq(employees.id, id))
    .run();
  return c.json(toEmployee(getEmployeeOrThrow(db, id)));
});
