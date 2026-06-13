/**
 * Money is represented internally as integer cents to avoid binary
 * floating-point drift on currency arithmetic. The wire format exposes
 * `hourlyRate` as dollars for ergonomics; conversions happen at the boundary.
 */

/** Round to the nearest cent, half-up, guarding against float representation error. */
export function roundCents(value: number): number {
  return Math.round(value + Number.EPSILON);
}

/** Convert a dollar amount (e.g. 22.5) to integer cents (2250). */
export function dollarsToCents(dollars: number): number {
  return roundCents(dollars * 100);
}

/** Convert integer cents (2250) to a dollar number (22.5). */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/** Format integer cents as a USD string, e.g. 108563 -> "$1,085.63". */
export function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
