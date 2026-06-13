import { createDb, type DB } from "./client.js";
import { employees, timeEntries, weekReviews } from "./schema.js";
import { resolveDbUrl, isMain } from "../config.js";
import { runMigrations } from "./migrate.js";

/**
 * Deterministic demo data that mirrors the design sketch:
 *  - Jane Doe ($22.50/h): 45.5h in the week of Jun 08–14 2026 -> 5.5h overtime,
 *    pending review (the "$900.00 + $185.63 = $1,085.63" card).
 *  - John Smith ($18.00/h): 32h that week, already approved (locked).
 *  - Ana García ($25.00/h): inactive (soft-deleted), with historical entries
 *    in a prior week that must remain visible.
 *
 * "Today" in the seed is treated as 2026-06-12, so no entry is a future date.
 */
const SEED_NOW = "2026-06-12T09:00:00.000Z";

export function seed(db: DB): void {
  // Idempotent: clear in FK-safe order, then insert.
  db.delete(weekReviews).run();
  db.delete(timeEntries).run();
  db.delete(employees).run();

  db.insert(employees).values([
    { id: "emp_jane", firstName: "Jane", lastName: "Doe", hourlyRateCents: 2250, deactivatedAt: null, createdAt: SEED_NOW },
    { id: "emp_john", firstName: "John", lastName: "Smith", hourlyRateCents: 1800, deactivatedAt: null, createdAt: SEED_NOW },
    { id: "emp_ana", firstName: "Ana", lastName: "García", hourlyRateCents: 2500, deactivatedAt: "2026-05-20T12:00:00.000Z", createdAt: SEED_NOW },
  ]).run();

  db.insert(timeEntries).values([
    // Jane — 45.5h, Mon–Fri (Jun 08–12), pending.
    { id: "te_jane_1", employeeId: "emp_jane", date: "2026-06-08", hours: 8, createdAt: SEED_NOW },
    { id: "te_jane_2", employeeId: "emp_jane", date: "2026-06-09", hours: 7.5, createdAt: SEED_NOW },
    { id: "te_jane_3", employeeId: "emp_jane", date: "2026-06-10", hours: 10, createdAt: SEED_NOW },
    { id: "te_jane_4", employeeId: "emp_jane", date: "2026-06-11", hours: 10, createdAt: SEED_NOW },
    { id: "te_jane_5", employeeId: "emp_jane", date: "2026-06-12", hours: 10, createdAt: SEED_NOW },
    // John — 32h, Mon–Thu (Jun 08–11), approved.
    { id: "te_john_1", employeeId: "emp_john", date: "2026-06-08", hours: 8, createdAt: SEED_NOW },
    { id: "te_john_2", employeeId: "emp_john", date: "2026-06-09", hours: 8, createdAt: SEED_NOW },
    { id: "te_john_3", employeeId: "emp_john", date: "2026-06-10", hours: 8, createdAt: SEED_NOW },
    { id: "te_john_4", employeeId: "emp_john", date: "2026-06-11", hours: 8, createdAt: SEED_NOW },
    // Ana — historical entries in a prior week (still visible despite inactive).
    { id: "te_ana_1", employeeId: "emp_ana", date: "2026-05-11", hours: 6, createdAt: SEED_NOW },
    { id: "te_ana_2", employeeId: "emp_ana", date: "2026-05-12", hours: 6, createdAt: SEED_NOW },
  ]).run();

  // John's week is approved -> his entries for that week are locked.
  db.insert(weekReviews).values([
    { employeeId: "emp_john", weekStart: "2026-06-08", status: "approved", reviewedAt: SEED_NOW },
  ]).run();
}

export function runSeed(url = resolveDbUrl()): void {
  const { db, sqlite } = createDb(url);
  seed(db);
  sqlite.close();
  console.log(`✓ seeded ${url}`);
}

if (isMain(import.meta.url)) {
  // Ensure the schema exists before seeding (handy for a one-shot setup).
  runMigrations();
  runSeed();
}
