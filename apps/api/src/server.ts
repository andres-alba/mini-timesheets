import { serve } from "@hono/node-server";
import { createDb } from "./db/client.js";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";
import { resolveDbUrl, PORT } from "./config.js";

// Ensure the schema is present, then serve.
runMigrations();
const { db } = createDb(resolveDbUrl());
const app = createApp(db);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`✓ API listening on http://localhost:${info.port}`);
});
