import type { Employee, TimeEntry } from "@mini/shared";
import { centsToDollars } from "@mini/shared";
import type { EmployeeRow, TimeEntryRow } from "./db/schema.js";

/** Map a DB employee row to the wire shape (cents -> dollars, derived status). */
export function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    hourlyRate: centsToDollars(row.hourlyRateCents),
    status: row.deactivatedAt ? "inactive" : "active",
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
  };
}

export function toTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: row.date,
    hours: row.hours,
    createdAt: row.createdAt,
  };
}
