import { Hono } from "hono";
import { cors } from "hono/cors";
import type { DB } from "./db/client.js";
import type { AppEnv } from "./http.js";
import { resolveLocale, translate } from "./i18n.js";
import { AppError, toEnvelope } from "./errors.js";
import { employeesRoute } from "./routes/employees.js";
import { timeEntriesRoute } from "./routes/time-entries.js";
import { weeksRoute } from "./routes/weeks.js";

/** Build the Hono app around an injected database (so tests can pass :memory:). */
export function createApp(db: DB) {
  const app = new Hono<AppEnv>();

  app.use("*", cors());
  app.use("*", async (c, next) => {
    c.set("db", db);
    c.set("locale", resolveLocale(c.req.header("accept-language")));
    await next();
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/api/employees", employeesRoute);
  app.route("/api", timeEntriesRoute);
  app.route("/api/weeks", weeksRoute);

  app.notFound((c) =>
    c.json(toEnvelope("NOT_FOUND", translate("NOT_FOUND", c.var.locale ?? "en")), 404),
  );

  app.onError((err, c) => {
    const locale = c.var.locale ?? "en";
    if (err instanceof AppError) {
      return c.json(
        toEnvelope(err.code, translate(err.code, locale), err.details),
        err.status,
      );
    }
    console.error("Unhandled error:", err);
    return c.json(toEnvelope("INTERNAL", translate("INTERNAL", locale)), 500);
  });

  return app;
}
