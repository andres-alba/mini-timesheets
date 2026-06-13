import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WeekEmployeeSummary } from "@mini/shared";
import { WeekSummaryCard } from "./WeekSummaryCard";

const base: WeekEmployeeSummary = {
  employeeId: "emp_jane",
  firstName: "Jane",
  lastName: "Doe",
  hourlyRate: 22.5,
  weekStart: "2026-06-08",
  weekEnd: "2026-06-14",
  totalHours: 45.5,
  regularHours: 40,
  overtimeHours: 5.5,
  regularPayCents: 90000,
  overtimePayCents: 18563,
  totalPayCents: 108563,
  status: "pending",
  reviewedAt: null,
  locked: false,
};

describe("WeekSummaryCard", () => {
  it("renders the overtime split and the formatted pay breakdown", () => {
    render(<WeekSummaryCard summary={base} onReview={() => {}} reviewing={false} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/Regular 40\.0h · Overtime 5\.5h/)).toBeInTheDocument();
    // Pay breakdown formatted from cents by the shared formatter.
    expect(screen.getByText(/\$900\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$185\.63/)).toBeInTheDocument();
    expect(screen.getByText("$1,085.63")).toBeInTheDocument();
  });

  it("fires onReview('approve') when a pending week is approved", async () => {
    const onReview = vi.fn();
    render(<WeekSummaryCard summary={base} onReview={onReview} reviewing={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onReview).toHaveBeenCalledWith("approve");
  });

  it("hides actions and shows (locked) once approved", () => {
    render(
      <WeekSummaryCard
        summary={{ ...base, status: "approved", locked: true }}
        onReview={() => {}}
        reviewing={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText("(locked)")).toBeInTheDocument();
    expect(screen.getByText("✅ Approved")).toBeInTheDocument();
  });

  it("shows a single total (no '+') when there is no overtime", () => {
    render(
      <WeekSummaryCard
        summary={{
          ...base,
          firstName: "John",
          lastName: "Smith",
          totalHours: 32,
          regularHours: 32,
          overtimeHours: 0,
          regularPayCents: 57600,
          overtimePayCents: 0,
          totalPayCents: 57600,
        }}
        onReview={() => {}}
        reviewing={false}
      />,
    );

    expect(screen.getByText("$576.00")).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });
});
