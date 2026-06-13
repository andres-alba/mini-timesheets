import { useState, type FormEvent } from "react";
import {
  timeEntryInputSchema,
  todayLocalISO,
  type TimeEntry,
  type TimeEntryInput,
} from "@mini/shared";
import { fieldErrors } from "../lib/validationMessages";
import { Button, Field, TextInput, ErrorBanner } from "./ui";

export function TimeEntryForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitError,
  layout = "inline",
}: {
  initial?: TimeEntry;
  onSubmit: (input: TimeEntryInput) => void;
  onCancel?: () => void;
  submitting: boolean;
  submitError: unknown;
  layout?: "inline" | "stacked";
}) {
  const today = todayLocalISO();
  const [date, setDate] = useState(initial?.date ?? today);
  const [hours, setHours] = useState(initial ? String(initial.hours) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = timeEntryInputSchema({ today }).safeParse({
      date,
      hours: hours.trim() === "" ? Number.NaN : Number(hours),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
    if (!initial) setHours(""); // reset hours after a fresh log
  }

  const wrap =
    layout === "inline"
      ? "flex flex-wrap items-end gap-3"
      : "space-y-3";

  return (
    <form onSubmit={handleSubmit} className={wrap}>
      <div className={layout === "inline" ? "w-40" : ""}>
        <Field label="Date" error={errors.date}>
          <TextInput
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <div className={layout === "inline" ? "w-28" : ""}>
        <Field label="Hours" error={errors.hours}>
          <TextInput
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save" : "Log time"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {submitError != null && (
        <div className="w-full">
          <ErrorBanner error={submitError} />
        </div>
      )}
    </form>
  );
}
