import { z } from "zod";
import { isValidDateString, todayLocalISO } from "./week.js";

/**
 * Validation schemas shared by the API (request validation) and the client
 * (form validation). Messages are short stable keys; the API maps them to
 * localized user-facing text, the client may localize them too (bonus).
 */

export const HOURS_MIN = 0.25;
export const HOURS_MAX = 24;
export const RATE_MAX = 10_000; // sanity ceiling, dollars/hour

const twoDecimals = (v: number) =>
  Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;

export const employeeInputSchema = z.object({
  firstName: z.string().trim().min(1, "firstName_required").max(80, "firstName_too_long"),
  lastName: z.string().trim().min(1, "lastName_required").max(80, "lastName_too_long"),
  hourlyRate: z
    .number({ invalid_type_error: "rate_required" })
    .positive("rate_positive")
    .max(RATE_MAX, "rate_too_high")
    .refine(twoDecimals, "rate_two_decimals"),
});
export type EmployeeInput = z.infer<typeof employeeInputSchema>;

/** Partial update — every field optional, same constraints when present. */
export const employeeUpdateSchema = employeeInputSchema.partial();
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;

/**
 * Time-entry schema is a factory because the "no future date" rule depends on
 * "today", which differs by clock/timezone. Injecting `today` keeps it pure
 * and testable; both client and API pass their own local today by default.
 */
export function timeEntryInputSchema(opts?: { today?: string }) {
  const today = opts?.today ?? todayLocalISO();
  return z.object({
    date: z
      .string()
      .refine(isValidDateString, "date_invalid")
      .refine((d) => d <= today, "date_future"),
    hours: z
      .number({ invalid_type_error: "hours_required" })
      .min(HOURS_MIN, "hours_too_low")
      .max(HOURS_MAX, "hours_too_high")
      .refine(twoDecimals, "hours_two_decimals"),
  });
}
export type TimeEntryInput = z.infer<ReturnType<typeof timeEntryInputSchema>>;

export const timeEntryUpdateSchema = (opts?: { today?: string }) =>
  timeEntryInputSchema(opts).partial();

export const weekReviewSchema = z.object({
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "action_invalid" }),
  }),
});
export type WeekReviewInput = z.infer<typeof weekReviewSchema>;

/** Query params for the weekly summary endpoint. */
export const weekQuerySchema = z.object({
  week: z.string().refine(isValidDateString, "date_invalid").optional(),
  includeInactive: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});
