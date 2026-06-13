import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  EmployeeInput,
  EmployeeUpdate,
  TimeEntryInput,
} from "@mini/shared";
import { api, qk } from "./api";

/* ----------------------------- Employees ----------------------------- */

export function useEmployees(includeInactive: boolean) {
  return useQuery({
    queryKey: qk.employees(includeInactive),
    queryFn: () => api.employees.list({ includeInactive }),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeInput) => api.employees.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmployeeUpdate }) =>
      api.employees.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useSetEmployeeActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.employees.reactivate(id) : api.employees.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

/* ---------------------------- Time entries ---------------------------- */

export function useTimeEntries(employeeId: string | undefined) {
  return useQuery({
    queryKey: employeeId ? qk.timeEntries(employeeId) : ["timeEntries", "none"],
    queryFn: () => api.timeEntries.listForEmployee(employeeId!),
    enabled: Boolean(employeeId),
  });
}

function useTimeEntryInvalidation() {
  const qc = useQueryClient();
  return (employeeId: string) => {
    qc.invalidateQueries({ queryKey: qk.timeEntries(employeeId) });
    qc.invalidateQueries({ queryKey: ["week"] });
  };
}

export function useCreateTimeEntry() {
  const invalidate = useTimeEntryInvalidation();
  return useMutation({
    mutationFn: ({ employeeId, input }: { employeeId: string; input: TimeEntryInput }) =>
      api.timeEntries.create(employeeId, input),
    onSuccess: (_data, vars) => invalidate(vars.employeeId),
  });
}

export function useUpdateTimeEntry() {
  const invalidate = useTimeEntryInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      employeeId: string;
      input: Partial<TimeEntryInput>;
    }) => api.timeEntries.update(id, input),
    onSuccess: (_data, vars) => invalidate(vars.employeeId),
  });
}

export function useDeleteTimeEntry() {
  const invalidate = useTimeEntryInvalidation();
  return useMutation({
    mutationFn: ({ id }: { id: string; employeeId: string }) =>
      api.timeEntries.remove(id),
    onSuccess: (_data, vars) => invalidate(vars.employeeId),
  });
}

/* ------------------------------- Weeks -------------------------------- */

export function useWeekSummary(week: string, includeInactive: boolean) {
  return useQuery({
    queryKey: qk.week(week, includeInactive),
    queryFn: () => api.weeks.summary(week, includeInactive),
  });
}

export function useReviewWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      week,
      action,
    }: {
      employeeId: string;
      week: string;
      action: "approve" | "reject";
    }) => api.weeks.review(employeeId, week, action),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["week"] });
      qc.invalidateQueries({ queryKey: qk.timeEntries(vars.employeeId) });
    },
  });
}
