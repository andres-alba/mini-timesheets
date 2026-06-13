import { useState } from "react";
import type { Employee, EmployeeInput } from "@mini/shared";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useSetEmployeeActive,
} from "../lib/hooks";
import { Button, ErrorBanner, Modal, Spinner, StatusPill } from "../components/ui";
import { EmployeeForm } from "../components/EmployeeForm";

export function EmployeesPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);

  const employees = useEmployees(showInactive);
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const setActive = useSetEmployeeActive();

  function handleSubmit(input: EmployeeInput) {
    if (editing) {
      update.mutate(
        { id: editing.id, input },
        { onSuccess: () => setEditing(null) },
      );
    } else {
      create.mutate(input, { onSuccess: () => setCreating(false) });
    }
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-800">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Employees</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Add employee
        </Button>
      </header>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        Show inactive
      </label>

      {setActive.error && <ErrorBanner error={setActive.error} />}

      {employees.isLoading ? (
        <Spinner />
      ) : employees.isError ? (
        <ErrorBanner error={employees.error} />
      ) : employees.data!.length === 0 ? (
        <p className="py-6 text-sm text-slate-500 dark:text-slate-400">No employees yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {employees.data!.map((emp) => (
            <li key={emp.id} className="flex items-center gap-4 py-3">
              <span className="flex-1 font-medium text-slate-900 dark:text-slate-100">
                {emp.firstName} {emp.lastName}
              </span>
              <span className="w-24 text-right tabular-nums text-slate-700 dark:text-slate-300">
                ${emp.hourlyRate.toFixed(2)}/h
              </span>
              <span className="w-20">
                <StatusPill status={emp.status} />
              </span>
              <div className="flex w-44 justify-end gap-2">
                <Button onClick={() => setEditing(emp)}>Edit</Button>
                {emp.status === "active" ? (
                  <Button
                    variant="danger"
                    disabled={setActive.isPending}
                    onClick={() => setActive.mutate({ id: emp.id, active: false })}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    disabled={setActive.isPending}
                    onClick={() => setActive.mutate({ id: emp.id, active: true })}
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <Modal
          title={editing ? "Edit employee" : "Add employee"}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        >
          <EmployeeForm
            initial={editing ?? undefined}
            submitting={create.isPending || update.isPending}
            submitError={editing ? update.error : create.error}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}
    </section>
  );
}
