import type { PayBreakdown } from "./calc.js";

export type EmployeeStatus = "active" | "inactive";
export type WeekStatus = "pending" | "approved" | "rejected";

/** Employee as returned by the API (money as dollars on the wire). */
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  hourlyRate: number; // dollars, e.g. 22.5
  status: EmployeeStatus;
  deactivatedAt: string | null; // ISO timestamp; null === active
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  hours: number; // decimal hours
  createdAt: string;
}

/** One employee's computed + reviewed summary for a single week. */
export interface WeekEmployeeSummary extends PayBreakdown {
  employeeId: string;
  firstName: string;
  lastName: string;
  hourlyRate: number;
  weekStart: string; // Monday, YYYY-MM-DD
  weekEnd: string; // Sunday, YYYY-MM-DD
  status: WeekStatus;
  reviewedAt: string | null;
  locked: boolean; // true once approved
}

export interface WeekSummaryResponse {
  weekStart: string;
  weekEnd: string;
  employees: WeekEmployeeSummary[];
}

/** Stable, machine-readable error codes shared by API and client. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "EMPLOYEE_INACTIVE"
  | "WEEK_LOCKED"
  | "INTERNAL";

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string; // localized, user-facing
    details?: unknown; // optional field-level info (e.g. zod issues)
  };
}
