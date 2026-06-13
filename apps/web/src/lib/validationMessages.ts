import type { ZodError } from "@mini/shared";

/**
 * The shared Zod schemas emit stable message *keys*; the client maps them to
 * friendly text. (Localizing these is the "UI i18n" bonus — easy to extend.)
 */
const MESSAGES: Record<string, string> = {
  firstName_required: "First name is required.",
  firstName_too_long: "First name is too long.",
  lastName_required: "Last name is required.",
  lastName_too_long: "Last name is too long.",
  rate_required: "Enter an hourly rate.",
  rate_positive: "Rate must be greater than 0.",
  rate_too_high: "Rate is too high.",
  rate_two_decimals: "Use at most 2 decimals.",
  date_invalid: "Enter a valid date.",
  date_future: "Date cannot be in the future.",
  hours_required: "Enter hours worked.",
  hours_too_low: "Minimum is 0.25 hours.",
  hours_too_high: "Maximum is 24 hours.",
  hours_two_decimals: "Use at most 2 decimals.",
};

export function friendlyMessage(code: string): string {
  return MESSAGES[code] ?? code;
}

/** Flatten a ZodError into { field: friendlyMessage }. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = friendlyMessage(issue.message);
  }
  return out;
}
