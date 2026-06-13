import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createDb } from "../db/client.js";
import { applyMigrations } from "../db/migrate.js";
import { createApp } from "../app.js";
import { seed } from "../db/seed.js";
import type { AppEnv } from "../http.js";

/** Spin up a fresh in-memory API for each test. */
function freshApp(withSeed = false): Hono<AppEnv> {
  const { db } = createDb(":memory:");
  applyMigrations(db);
  if (withSeed) seed(db);
  return createApp(db) as unknown as Hono<AppEnv>;
}

const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/** Read a response body loosely — Hono types `.json()` as `unknown`. */
const j = (res: { json(): Promise<unknown> }): Promise<any> => res.json();

describe("approval flow locks time entries", () => {
  let app: Hono<AppEnv>;

  beforeEach(() => {
    app = freshApp();
  });

  it("logs time, approves the week, then refuses edits/deletes/new entries", async () => {
    const created = await app.request(
      "/api/employees",
      json({ firstName: "Test", lastName: "Worker", hourlyRate: 20 }),
    );
    expect(created.status).toBe(201);
    const employee = await j(created);

    // Log a time entry inside the week of Mon 2026-06-08.
    const logged = await app.request(
      `/api/employees/${employee.id}/time-entries`,
      json({ date: "2026-06-08", hours: 8 }),
    );
    expect(logged.status).toBe(201);
    const entry = await j(logged);

    // Approve that week.
    const review = await app.request(
      `/api/weeks/2026-06-08/employees/${employee.id}/review`,
      json({ action: "approve" }),
    );
    expect(review.status).toBe(200);
    const summary = await j(review);
    expect(summary.status).toBe("approved");
    expect(summary.locked).toBe(true);

    // Editing an entry in the locked week -> 409 WEEK_LOCKED.
    const edit = await app.request(`/api/time-entries/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hours: 9 }),
    });
    expect(edit.status).toBe(409);
    expect((await j(edit)).error.code).toBe("WEEK_LOCKED");

    // Deleting an entry in the locked week -> 409.
    const del = await app.request(`/api/time-entries/${entry.id}`, {
      method: "DELETE",
    });
    expect(del.status).toBe(409);

    // Adding a new entry in the locked week -> 409.
    const add = await app.request(
      `/api/employees/${employee.id}/time-entries`,
      json({ date: "2026-06-09", hours: 4 }),
    );
    expect(add.status).toBe(409);
  });

  it("unlocks again when the week is rejected", async () => {
    const employee = await j(
      await app.request(
        "/api/employees",
        json({ firstName: "Re", lastName: "Open", hourlyRate: 15 }),
      ),
    );
    const entry = await j(
      await app.request(
        `/api/employees/${employee.id}/time-entries`,
        json({ date: "2026-06-08", hours: 5 }),
      ),
    );

    await app.request(
      `/api/weeks/2026-06-08/employees/${employee.id}/review`,
      json({ action: "approve" }),
    );
    // Reviewer changes their mind -> reject -> editable again.
    const rejected = await app.request(
      `/api/weeks/2026-06-08/employees/${employee.id}/review`,
      json({ action: "reject" }),
    );
    expect((await j(rejected)).status).toBe("rejected");

    const edit = await app.request(`/api/time-entries/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hours: 6 }),
    });
    expect(edit.status).toBe(200);
    expect((await j(edit)).hours).toBe(6);
  });
});

describe("validation & business rules", () => {
  it("rejects entries for inactive employees with EMPLOYEE_INACTIVE", async () => {
    const app = freshApp();
    const employee = await j(
      await app.request(
        "/api/employees",
        json({ firstName: "Soft", lastName: "Deleted", hourlyRate: 30 }),
      ),
    );
    await app.request(`/api/employees/${employee.id}/deactivate`, { method: "POST" });

    const res = await app.request(
      `/api/employees/${employee.id}/time-entries`,
      json({ date: "2026-06-08", hours: 8 }),
    );
    expect(res.status).toBe(422);
    expect((await j(res)).error.code).toBe("EMPLOYEE_INACTIVE");
  });

  it("rejects future dates and out-of-range hours with VALIDATION_ERROR", async () => {
    const app = freshApp();
    const employee = await j(
      await app.request(
        "/api/employees",
        json({ firstName: "V", lastName: "X", hourlyRate: 10 }),
      ),
    );

    const future = await app.request(
      `/api/employees/${employee.id}/time-entries`,
      json({ date: "2999-01-01", hours: 8 }),
    );
    expect(future.status).toBe(400);
    expect((await j(future)).error.code).toBe("VALIDATION_ERROR");

    const tooMany = await app.request(
      `/api/employees/${employee.id}/time-entries`,
      json({ date: "2026-06-08", hours: 25 }),
    );
    expect(tooMany.status).toBe(400);
  });
});

describe("weekly summary computation (via shared calc)", () => {
  it("splits regular vs overtime and totals pay, matching the sketch", async () => {
    const app = freshApp(true); // seeded demo data
    const body = await j(await app.request("/api/weeks?week=2026-06-08"));

    const jane = body.employees.find((e: any) => e.firstName === "Jane");
    expect(jane.regularHours).toBe(40);
    expect(jane.overtimeHours).toBe(5.5);
    expect(jane.regularPayCents).toBe(90000);
    expect(jane.overtimePayCents).toBe(18563);
    expect(jane.totalPayCents).toBe(108563);
    expect(jane.status).toBe("pending");

    const john = body.employees.find((e: any) => e.firstName === "John");
    expect(john.overtimeHours).toBe(0);
    expect(john.status).toBe("approved");
    expect(john.locked).toBe(true);
  });

  it("hides inactive employees by default, includes them on request", async () => {
    const app = freshApp(true);
    const def = await j(await app.request("/api/weeks?week=2026-05-11"));
    expect(def.employees.some((e: any) => e.firstName === "Ana")).toBe(false);

    const all = await j(
      await app.request("/api/weeks?week=2026-05-11&includeInactive=true"),
    );
    expect(all.employees.some((e: any) => e.firstName === "Ana")).toBe(true);
  });
});

describe("i18n error envelope", () => {
  it("localizes the message via Accept-Language while keeping a stable code", async () => {
    const app = freshApp();
    const en = await app.request("/api/employees/does-not-exist");
    expect(en.status).toBe(404);
    expect((await j(en)).error.message).toMatch(/not found/i);

    const es = await app.request("/api/employees/does-not-exist", {
      headers: { "accept-language": "es-MX,es;q=0.9" },
    });
    const body = await j(es);
    expect(body.error.code).toBe("NOT_FOUND"); // code is stable across locales
    expect(body.error.message).toMatch(/no se encontró/i);
  });
});
