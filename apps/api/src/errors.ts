import type { ApiErrorCode, ApiErrorEnvelope } from "@mini/shared";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const STATUS_BY_CODE: Record<ApiErrorCode, ContentfulStatusCode> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  EMPLOYEE_INACTIVE: 422,
  WEEK_LOCKED: 409,
  INTERNAL: 500,
};

/**
 * The one error type the routes throw. The central error handler turns it into
 * the localized {@link ApiErrorEnvelope}. Carrying a stable `code` (not a
 * message) keeps localization and HTTP status out of the call sites.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: ContentfulStatusCode;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, details?: unknown) {
    super(code);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const notFound = () => new AppError("NOT_FOUND");
export const employeeInactive = () => new AppError("EMPLOYEE_INACTIVE");
export const weekLocked = () => new AppError("WEEK_LOCKED");
export const validationError = (details?: unknown) =>
  new AppError("VALIDATION_ERROR", details);

export function toEnvelope(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorEnvelope {
  return { error: { code, message, ...(details ? { details } : {}) } };
}
