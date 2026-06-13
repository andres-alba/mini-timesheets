import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type DB } from "./client.js";
import { MIGRATIONS_DIR, resolveDbUrl, isMain } from "../config.js";

/** Apply all generated migrations to an already-open db connection. */
export function applyMigrations(db: DB): void {
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

/** Open the configured database and migrate it. */
export function runMigrations(url = resolveDbUrl()): void {
  if (url !== ":memory:") {
    fs.mkdirSync(path.dirname(url), { recursive: true });
  }
  const { db, sqlite } = createDb(url);
  applyMigrations(db);
  sqlite.close();
  console.log(`✓ migrated ${url}`);
}

if (isMain(import.meta.url)) {
  runMigrations();
}
