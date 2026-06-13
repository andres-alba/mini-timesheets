import { useState } from "react";
import { getWeekStart, addWeeks, todayLocalISO } from "@mini/shared";
import { useWeekSummary, useReviewWeek } from "../lib/hooks";
import { formatShortDate } from "../lib/format";
import { Button, ErrorBanner, Spinner } from "../components/ui";
import { WeekSummaryCard } from "../components/WeekSummaryCard";

export function WeekPage() {
  const [week, setWeek] = useState(() => getWeekStart(todayLocalISO()));
  const [showInactive, setShowInactive] = useState(false);

  const summary = useWeekSummary(week, showInactive);
  const review = useReviewWeek();

  const weekEnd = summary.data?.weekEnd ?? week;

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-800">
      <header className="mb-4 flex items-center justify-center gap-4">
        <Button variant="ghost" onClick={() => setWeek((w) => addWeeks(w, -1))}>
          ◀
        </Button>
        <h1 className="text-lg font-semibold tabular-nums">
          Week of {formatShortDate(week)} – {formatShortDate(weekEnd)}
        </h1>
        <Button variant="ghost" onClick={() => setWeek((w) => addWeeks(w, 1))}>
          ▶
        </Button>
      </header>

      <label className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        Show inactive
      </label>

      {review.error && (
        <div className="mb-3">
          <ErrorBanner error={review.error} />
        </div>
      )}

      {summary.isLoading ? (
        <Spinner />
      ) : summary.isError ? (
        <ErrorBanner error={summary.error} />
      ) : summary.data!.employees.length === 0 ? (
        <p className="py-6 text-sm text-slate-500 dark:text-slate-400">No employees to summarize.</p>
      ) : (
        <div>
          {summary.data!.employees.map((emp) => (
            <WeekSummaryCard
              key={emp.employeeId}
              summary={emp}
              reviewing={review.isPending}
              onReview={(action) =>
                review.mutate({ employeeId: emp.employeeId, week, action })
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
