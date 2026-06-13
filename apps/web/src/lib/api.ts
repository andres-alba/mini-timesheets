import { createApiClient, ApiError } from "@mini/shared";

/**
 * Single shared API client. baseUrl is empty so requests are same-origin
 * ("/api/..."), which Vite proxies to the Hono server in dev. The browser's
 * language is forwarded so the API localizes error messages (en/es).
 */
export const api = createApiClient({
  baseUrl: "",
  acceptLanguage: typeof navigator !== "undefined" ? navigator.language : "en",
});

export { ApiError };

/** Centralized React Query keys so mutations can invalidate precisely. */
export const qk = {
  employees: (includeInactive: boolean) =>
    ["employees", { includeInactive }] as const,
  timeEntries: (employeeId: string) => ["timeEntries", employeeId] as const,
  week: (week: string, includeInactive: boolean) =>
    ["week", week, { includeInactive }] as const,
};
