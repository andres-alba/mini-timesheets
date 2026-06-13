/**
 * Calendar-date helpers. All dates are plain `YYYY-MM-DD` strings interpreted
 * as UTC midnight so arithmetic never shifts across a timezone boundary.
 *
 * Weeks run Monday -> Sunday to match the design sketch ("Jun 08 – Jun 14",
 * which is Mon–Sun in 2026). The week is identified by its Monday start date.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const d = parseUTC(date);
  return !Number.isNaN(d.getTime()) && formatUTC(d) === date;
}

function parseUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? NaN, (m ?? 1) - 1, d ?? 1));
}

function formatUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday (inclusive) of the week containing `date`, as `YYYY-MM-DD`. */
export function getWeekStart(date: string): string {
  const d = parseUTC(date);
  const mondayIndex = (d.getUTCDay() + 6) % 7; // Sun=0..Sat=6 -> Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - mondayIndex);
  return formatUTC(d);
}

/** Sunday (inclusive) of the week containing `date`, as `YYYY-MM-DD`. */
export function getWeekEnd(date: string): string {
  const start = parseUTC(getWeekStart(date));
  start.setUTCDate(start.getUTCDate() + 6);
  return formatUTC(start);
}

/** Stable identifier for a week — its Monday start date. */
export function getWeekId(date: string): string {
  return getWeekStart(date);
}

/** Shift a week-start date by `n` whole weeks (negative shifts back). */
export function addWeeks(weekStart: string, n: number): string {
  const d = parseUTC(weekStart);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return formatUTC(d);
}

export function isSameWeek(a: string, b: string): boolean {
  return getWeekStart(a) === getWeekStart(b);
}

/** The seven dates Mon..Sun of the week containing `date`. */
export function datesInWeek(date: string): string[] {
  const start = parseUTC(getWeekStart(date));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return formatUTC(d);
  });
}

/** Today's date in the host's local timezone as `YYYY-MM-DD`. */
export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
