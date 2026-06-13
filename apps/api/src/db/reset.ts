import fs from "node:fs";
import { resolveDbUrl, isMain } from "../config.js";
import { runMigrations } from "./migrate.js";
import { runSeed } from "./seed.js";

/** Drop the database file (if any), recreate the schema, and reseed. */
export function reset(url = resolveDbUrl()): void {
  if (url !== ":memory:") {
    for (const suffix of ["", "-shm", "-wal"]) {
      fs.rmSync(`${url}${suffix}`, { force: true });
    }
  }
  runMigrations(url);
  runSeed(url);
}

if (isMain(import.meta.url)) {
  reset();
}
