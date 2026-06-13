import type {
  ApiErrorCode,
  ApiErrorEnvelope,
  Employee,
  TimeEntry,
  WeekSummaryResponse,
} from "./types.js";
import type {
  EmployeeInput,
  EmployeeUpdate,
  TimeEntryInput,
} from "./schemas.js";

/**
 * A tiny, headless, framework-agnostic API client. No React, no `window`,
 * no platform globals — `fetch` is injected, so it runs in the browser,
 * React Native, Node tests, or a server. The web app's React Query hooks
 * compose these methods; a future mobile client would reuse them verbatim.
 */

/** Thrown on any non-2xx response; carries the typed error envelope. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorEnvelope) {
    super(body.error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Inject a fetch implementation (defaults to the global one). */
  fetch?: typeof fetch;
  /** Sent as Accept-Language so the API localizes error messages. */
  acceptLanguage?: string;
}

export interface EmployeeQuery {
  includeInactive?: boolean;
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const base = options.baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (init?.body) headers.set("content-type", "application/json");
    if (options.acceptLanguage) {
      headers.set("accept-language", options.acceptLanguage);
    }
    const res = await fetchImpl(`${base}${path}`, { ...init, headers });
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      throw new ApiError(res.status, data as ApiErrorEnvelope);
    }
    return data as T;
  }

  const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

  return {
    employees: {
      list: (q: EmployeeQuery = {}) =>
        request<Employee[]>(
          `/api/employees${q.includeInactive ? "?includeInactive=true" : ""}`,
        ),
      get: (id: string) => request<Employee>(`/api/employees/${id}`),
      create: (input: EmployeeInput) =>
        request<Employee>("/api/employees", { method: "POST", ...json(input) }),
      update: (id: string, input: EmployeeUpdate) =>
        request<Employee>(`/api/employees/${id}`, {
          method: "PATCH",
          ...json(input),
        }),
      deactivate: (id: string) =>
        request<Employee>(`/api/employees/${id}/deactivate`, { method: "POST" }),
      reactivate: (id: string) =>
        request<Employee>(`/api/employees/${id}/reactivate`, { method: "POST" }),
    },
    timeEntries: {
      listForEmployee: (employeeId: string) =>
        request<TimeEntry[]>(`/api/employees/${employeeId}/time-entries`),
      create: (employeeId: string, input: TimeEntryInput) =>
        request<TimeEntry>(`/api/employees/${employeeId}/time-entries`, {
          method: "POST",
          ...json(input),
        }),
      update: (id: string, input: Partial<TimeEntryInput>) =>
        request<TimeEntry>(`/api/time-entries/${id}`, {
          method: "PATCH",
          ...json(input),
        }),
      remove: (id: string) =>
        request<void>(`/api/time-entries/${id}`, { method: "DELETE" }),
    },
    weeks: {
      summary: (week?: string, includeInactive = false) => {
        const params = new URLSearchParams();
        if (week) params.set("week", week);
        if (includeInactive) params.set("includeInactive", "true");
        const qs = params.toString();
        return request<WeekSummaryResponse>(`/api/weeks${qs ? `?${qs}` : ""}`);
      },
      review: (employeeId: string, week: string, action: "approve" | "reject") =>
        request<WeekSummaryResponse["employees"][number]>(
          `/api/weeks/${week}/employees/${employeeId}/review`,
          { method: "POST", ...json({ action }) },
        ),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
