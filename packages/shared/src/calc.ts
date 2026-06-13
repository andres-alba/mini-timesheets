import { roundCents } from "./money.js";

/**
 * Overtime / pay calculation — the single source of truth for payroll math.
 * Lives in the shared package so the API and any client agree to the cent.
 *
 * Rule: hours beyond 40 in a single week are overtime, paid at 1.5x.
 * Each pay component is rounded to the nearest cent independently and then
 * summed (matching the sketch: $900.00 + $185.63 = $1,085.63).
 */

export const OVERTIME_THRESHOLD_HOURS = 40;
export const OVERTIME_MULTIPLIER = 1.5;

export interface PayBreakdown {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPayCents: number;
  overtimePayCents: number;
  totalPayCents: number;
}

/** Round an hours figure to 2 decimals to absorb summation float drift. */
export function roundHours(hours: number): number {
  return Math.round((hours + Number.EPSILON) * 100) / 100;
}

/** Sum a list of hour values for a single week. */
export function sumHours(hours: number[]): number {
  return roundHours(hours.reduce((acc, h) => acc + h, 0));
}

/**
 * Compute the pay breakdown for a single week's total hours at a given rate.
 * @param totalHours total hours worked in the week (>= 0)
 * @param hourlyRateCents hourly rate in integer cents (>= 0)
 */
export function calculatePay(
  totalHours: number,
  hourlyRateCents: number,
): PayBreakdown {
  if (!Number.isFinite(totalHours) || totalHours < 0) {
    throw new RangeError("totalHours must be a finite number >= 0");
  }
  if (!Number.isInteger(hourlyRateCents) || hourlyRateCents < 0) {
    throw new RangeError("hourlyRateCents must be a non-negative integer");
  }

  const total = roundHours(totalHours);
  const regularHours = Math.min(total, OVERTIME_THRESHOLD_HOURS);
  const overtimeHours = roundHours(Math.max(0, total - OVERTIME_THRESHOLD_HOURS));

  const regularPayCents = roundCents(regularHours * hourlyRateCents);
  const overtimePayCents = roundCents(
    overtimeHours * hourlyRateCents * OVERTIME_MULTIPLIER,
  );

  return {
    totalHours: total,
    regularHours,
    overtimeHours,
    regularPayCents,
    overtimePayCents,
    totalPayCents: regularPayCents + overtimePayCents,
  };
}

/** Convenience: sum a week's hour entries and compute pay in one call. */
export function summarizeWeek(
  weekHours: number[],
  hourlyRateCents: number,
): PayBreakdown {
  return calculatePay(sumHours(weekHours), hourlyRateCents);
}
