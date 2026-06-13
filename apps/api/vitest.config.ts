import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Integration tests build their own in-memory DB; run serially for clarity.
    pool: "forks",
    fileParallelism: false,
  },
});
