import { formatUSD, type WeekEmployeeSummary } from "@mini/shared";
import { formatHours } from "../lib/format";
import { Button, StatusPill } from "./ui";

/**
 * Presentational per-employee weekly summary. Pure: all figures come from the
 * API (computed by the shared calc), so this just formats and wires actions.
 */
export function WeekSummaryCard({
  summary,
  onReview,
  reviewing,
}: {
  summary: WeekEmployeeSummary;
  onReview: (action: "approve" | "reject") => void;
  reviewing: boolean;
}) {
  const hasOvertime = summary.overtimeHours > 0;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-700">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {summary.firstName} {summary.lastName}
          </span>
          <StatusPill status={summary.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Regular {formatHours(summary.regularHours)} · Overtime{" "}
          {formatHours(summary.overtimeHours)}
        </p>
        <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
          Pay:{" "}
          {hasOvertime ? (
            <span>
              {formatUSD(summary.regularPayCents)} +{" "}
              {formatUSD(summary.overtimePayCents)} ={" "}
              <strong>{formatUSD(summary.totalPayCents)}</strong>
            </span>
          ) : (
            <strong>{formatUSD(summary.totalPayCents)}</strong>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {summary.locked ? (
          <span className="text-xs italic text-slate-400 dark:text-slate-500">(locked)</span>
        ) : (
          <>
            <Button
              variant="primary"
              onClick={() => onReview("approve")}
              disabled={reviewing}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => onReview("reject")}
              disabled={reviewing}
            >
              Reject
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
