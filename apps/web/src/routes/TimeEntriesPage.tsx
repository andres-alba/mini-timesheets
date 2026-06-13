import { useState } from "react";
import type { TimeEntry, TimeEntryInput } from "@mini/shared";
import {
  useEmployees,
  useTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from "../lib/hooks";
import { formatDayLabel, formatHours } from "../lib/format";
import { Button, ErrorBanner, Modal, Spinner } from "../components/ui";
import { TimeEntryForm } from "../components/TimeEntryForm";

export function TimeEntriesPage() {
  // Include inactive in the selector so their historical entries stay viewable.
  const employees = useEmployees(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  // Default to the first employee once loaded.
  const employeeId =
    selectedId || employees.data?.find((e) => e.status === "active")?.id ||
    employees.data?.[0]?.id || "";
  const selected = employees.data?.find((e) => e.id === employeeId);

  const entries = useTimeEntries(employeeId || undefined);
  const create = useCreateTimeEntry();
  const update = useUpdateTimeEntry();
  const remove = useDeleteTimeEntry();

  function logTime(input: TimeEntryInput) {
    create.mutate({ employeeId, input });
  }
  function saveEdit(input: TimeEntryInput) {
    if (!editing) return;
    update.mutate(
      { id: editing.id, employeeId, input },
      { onSuccess: () => setEditing(null) },
    );
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-800">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Time entries</h1>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-300">Employee:</span>
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            value={employeeId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {employees.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
                {e.status === "inactive" ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </label>
      </header>

      {selected?.status === "inactive" && (
        <p className="mb-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          This employee is inactive — historical entries are read-only.
        </p>
      )}

      {(remove.error || update.error) && (
        <div className="mb-3">
          <ErrorBanner error={remove.error || update.error} />
        </div>
      )}

      {employees.isLoading || entries.isLoading ? (
        <Spinner />
      ) : entries.isError ? (
        <ErrorBanner error={entries.error} />
      ) : !employeeId ? (
        <p className="py-6 text-sm text-slate-500 dark:text-slate-400">No employees yet.</p>
      ) : entries.data!.length === 0 ? (
        <p className="py-6 text-sm text-slate-500 dark:text-slate-400">No time logged yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {entries.data!.map((entry) => (
            <li key={entry.id} className="flex items-center gap-4 py-2.5">
              <span className="w-32 font-medium text-slate-800 dark:text-slate-200">
                {formatDayLabel(entry.date)}
              </span>
              <span className="flex-1 tabular-nums text-slate-700 dark:text-slate-300">
                {formatHours(entry.hours)}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setEditing(entry)}>Edit</Button>
                <Button
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({ id: entry.id, employeeId })
                  }
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {employeeId && selected?.status === "active" && (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Log time</h2>
          <TimeEntryForm
            submitting={create.isPending}
            submitError={create.error}
            onSubmit={logTime}
          />
        </div>
      )}

      {editing && (
        <Modal title="Edit time entry" onClose={() => setEditing(null)}>
          <TimeEntryForm
            initial={editing}
            layout="stacked"
            submitting={update.isPending}
            submitError={update.error}
            onSubmit={saveEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </section>
  );
}
