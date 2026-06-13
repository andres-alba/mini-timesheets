import { useState, type FormEvent } from "react";
import {
  employeeInputSchema,
  type Employee,
  type EmployeeInput,
} from "@mini/shared";
import { fieldErrors } from "../lib/validationMessages";
import { Button, Field, TextInput, ErrorBanner } from "./ui";

export function EmployeeForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitError,
}: {
  initial?: Employee;
  onSubmit: (input: EmployeeInput) => void;
  onCancel: () => void;
  submitting: boolean;
  submitError: unknown;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [rate, setRate] = useState(initial ? String(initial.hourlyRate) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Validate through the SHARED schema — same rules the API enforces.
    const parsed = employeeInputSchema.safeParse({
      firstName,
      lastName,
      hourlyRate: rate.trim() === "" ? Number.NaN : Number(rate),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="First name" error={errors.firstName}>
        <TextInput
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Last name" error={errors.lastName}>
        <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </Field>
      <Field label="Hourly rate ($)" error={errors.hourlyRate}>
        <TextInput
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </Field>

      <ErrorBanner error={submitError} />

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Add employee"}
        </Button>
      </div>
    </form>
  );
}
