import type { z } from "zod";
import type { DB } from "./db/client.js";
import type { Locale } from "./i18n.js";
import { validationError } from "./errors.js";

export type AppEnv = {
  Variables: {
    db: DB;
    locale: Locale;
  };
};

/** Parse with a Zod schema or throw a VALIDATION_ERROR carrying field issues. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.message,
    }));
    throw validationError(details);
  }
  return result.data;
}
