import type { ApiErrorCode } from "@mini/shared";

export type Locale = "en" | "es";

/** Localized, user-facing messages for each stable error code. */
const MESSAGES: Record<Locale, Record<ApiErrorCode, string>> = {
  en: {
    VALIDATION_ERROR: "The submitted data is invalid.",
    NOT_FOUND: "The requested resource was not found.",
    EMPLOYEE_INACTIVE: "Time cannot be logged for an inactive employee.",
    WEEK_LOCKED: "This week has been approved and is locked from editing.",
    INTERNAL: "Something went wrong. Please try again.",
  },
  es: {
    VALIDATION_ERROR: "Los datos enviados no son válidos.",
    NOT_FOUND: "No se encontró el recurso solicitado.",
    EMPLOYEE_INACTIVE: "No se puede registrar tiempo para un empleado inactivo.",
    WEEK_LOCKED: "Esta semana fue aprobada y está bloqueada para edición.",
    INTERNAL: "Ocurrió un error. Inténtalo de nuevo.",
  },
};

/** Pick a supported locale from an Accept-Language header value. */
export function resolveLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return "en";
  // Take the highest-priority tag; we only branch on the primary subtag.
  const primary = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("es") ? "es" : "en";
}

export function translate(code: ApiErrorCode, locale: Locale): string {
  return MESSAGES[locale][code];
}
