/**
 * Web-only display helpers. (Money/calc formatting that the API also needs
 * lives in @mini/shared; these are purely presentational and client-side.)
 */

const WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});

/** "2026-06-08" -> "Mon Jun 08" (parsed as UTC to avoid timezone drift). */
export function formatDayLabel(isoDate: string): string {
  return WEEKDAY.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-06-08" -> "Jun 08". */
export function formatShortDate(isoDate: string): string {
  return MONTH_DAY.format(new Date(`${isoDate}T00:00:00Z`));
}

/** 40 -> "40.0h", 7.5 -> "7.5h". */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}
