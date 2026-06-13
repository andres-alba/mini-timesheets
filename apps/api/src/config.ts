import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** apps/api root (this file lives in apps/api/src). */
export const API_ROOT = path.resolve(here, "..");

export const MIGRATIONS_DIR = path.join(API_ROOT, "drizzle");
export const DEFAULT_DB_PATH = path.join(API_ROOT, "data", "timesheets.db");

export function resolveDbUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DB_PATH;
}

export const PORT = Number(process.env.PORT ?? 3001);

/** True when invoked directly as a script (not imported). */
export function isMain(importMetaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return importMetaUrl === pathToFileURL(entry).href;
}
