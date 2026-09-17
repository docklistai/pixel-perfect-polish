import { Check, Edit3, Undo2, X } from "lucide-react";
import * as React from "react";
import { ActionButton, DrawerShell, FormRow, FormSection, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import { useTimeEntryReview } from "../hooks/useTimeEntryReview";
import { approvalEligibility, REASON_LABEL } from "../lib/approvalEligibility";
import { hasIncompleteBreak, type TimeExceptionCode } from "../lib/timeExceptions";
import type { StoredTimesheetRow } from "../types";
import { TimeEntryAuditTrail } from "./TimeEntryAuditTrail";
import { TimeExceptionBadges } from "./TimeExceptionBadges";
import type { TimesheetStatus } from "./TimesheetTable";

interface Props {
  row: StoredTimesheetRow | null;
  liveWorkspaceId?: string | null;
  statusOf: (row: StoredTimesheetRow) => TimesheetStatus;
  onApprove: (row: StoredTimesheetRow, note: string) => void;
  onRevert: (row: StoredTimesheetRow) => void;
  onReject: (row: StoredTimesheetRow, reason?: string) => void;
  onAdjust: (row: StoredTimesheetRow) => void;
  onClose: () => void;
}

const deltaTone = (tone?: "warning" | "danger") =>
  tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-success";

export function TimesheetReviewDrawer({
  row,
  liveWorkspaceId = null,
  statusOf,
  onApprove,
  onRevert,
  onReject,
  onAdjust,
  onClose,
}: Props) {
  const [managerNote, setManagerNote] = React.useState("");
  const [rejectError, setRejectError] = React.useState<string | null>(null);
  const review = useTimeEntryReview(liveWorkspaceId, row?.id ?? null);

  React.useEffect(() => {
    setManagerNote("");
    setRejectError(null);
  }, [row]);

  const exceptionCodes = React.useMemo(() => {
    const codes = [...(row?.exceptionCodes ?? [])];
    if (review.data && hasIncompleteBreak(review.data.clockEvents)) {
      if (!codes.includes("incomplete-break")) codes.push("incomplete-break");
    }
    return codes as TimeExceptionCode[];
  }, [review.data, row?.exceptionCodes]);

  if (!row) return null;

  const status = statusOf(row);
  const isUnscheduledAttendance =
    row.exceptionCodes?.length === 1 && row.exceptionCodes[0] === "unscheduled-attendance";
  const reason = approvalEligibility(row, true, Boolean(managerNote.trim()));
  const canApprove = reason === "ok";
  const badgeTone =
    status === "approved" ? "success" : status === "unapproved" ? "danger" : "warning";
  const badgeLabel =
    status === "approved" ? "Approved" : status === "unapproved" ? "Unapproved" : "Pending";
  const timezone = row.timezone ?? "UTC";

  const clockedRows = [
    ...(row.workDate
      ? [{ label: "Work date", value: row.workDate, cls: "text-muted-foreground" }]
      : []),
    { label: "Scheduled", value: row.sched, cls: "text-muted-foreground" },
    { label: "Clocked in", value: `${row.in} (${row.inN})`, cls: deltaTone(row.inTone) },
    { label: "Clocked out", value: `${row.out} (${row.outN})`, cls: deltaTone(row.outTone) },
    { label: "Breaks (unpaid)", value: row.brk, cls: "text-muted-foreground" },
    { label: "Paid hours", value: row.paid, cls: "font-semibold text-brand" },
  ];

  return (
    <DrawerShell
      open
      onOpenChange={(open) => !open && onClose()}
      title={`${row.n} — Current review period`}
      description={`${row.role} · ${row.department}`}
      meta={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={badgeTone}>{badgeLabel}</StatusBadge>
          <TimeExceptionBadges codes={exceptionCodes} legacyLabel={row.exc} />
        </span>
      }
      width="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>
            Close
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => {
              onClose();
              onAdjust(row);
            }}
          >
            <Edit3 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Adjust
          </ActionButton>
          {status !== "approved" ? (
            <>
              {status !== "unapproved" && (
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    if (!managerNote.trim()) {
                      setRejectError("A reason is required when returning time for correction.");
                      const noteElem = document.getElementById("time-manager-note");
                      if (noteElem) noteElem.focus();
                      return;
                    }
                    onReject(row, managerNote.trim());
                    onClose();
                  }}
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Return for correction
                </ActionButton>
              )}
              <ActionButton
                disabled={!canApprove}
                title={reason === "ok" ? undefined : `Can't approve — ${REASON_LABEL[reason]}.`}
                onClick={() => {
                  onApprove(row, managerNote);
                  onClose();
                }}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Approve
              </ActionButton>
            </>
          ) : (
            <ActionButton
              variant="secondary"
              onClick={() => {
                onRevert(row);
                onClose();
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Revert
            </ActionButton>
          )}
        </>
      }
    >
      <FormSection title="Scheduled versus actual">
        <div className="divide-y divide-border">
          {clockedRows.map((clocked) => (
            <div key={clocked.label} className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {clocked.label}
              </span>
              <span className={cn("text-right text-sm font-semibold font-mono", clocked.cls)}>
                {clocked.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-border bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
          {row.timezoneAuthority === "scheduled-shift" && row.scheduledLocationName
            ? `Times use the immutable published venue timezone for ${row.scheduledLocationName} (${timezone}).`
            : row.timezoneAuthority === "draft-shift-fallback" && row.scheduledLocationName
              ? `Published venue evidence was unavailable; times use the current draft venue fallback for ${row.scheduledLocationName} (${timezone}).`
              : `No published shift was confidently matched. Times use the staff/workspace timezone (${timezone}).`}{" "}
          Docklist does not capture or claim a physical clocking location.
        </div>
      </FormSection>

      <TimeEntryAuditTrail
        data={review.data}
        isLoading={review.isLoading}
        isError={review.isError}
        timezone={timezone}
        demoEntries={row.auditTrail}
        live={Boolean(liveWorkspaceId)}
      />

      <FormSection
        title="Manager note"
        description={
          isUnscheduledAttendance
            ? "Required: record how this unscheduled attendance was verified before approval."
            : "Optional note recorded with approval."
        }
      >
        <FormRow
          label={isUnscheduledAttendance ? "Resolution note" : "Add a note"}
          htmlFor="time-manager-note"
          required={isUnscheduledAttendance}
        >
          <textarea
            id="time-manager-note"
            className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder={
              isUnscheduledAttendance
                ? "How was this unscheduled attendance verified?"
                : "Required for return for correction; optional for approval…"
            }
            value={managerNote}
            maxLength={2000}
            onChange={(event) => {
              setManagerNote(event.target.value);
              if (rejectError) setRejectError(null);
            }}
          />
          {rejectError && <p className="mt-1.5 text-xs text-danger font-medium">{rejectError}</p>}
        </FormRow>
      </FormSection>

      {row.flagged && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Flagged for review: </span>
          {row.flagNote || "Marked for review"}
        </div>
      )}

      {row.returnNote && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
          <span className="font-semibold">Return note: </span>
          {row.returnNote}
        </div>
      )}
    </DrawerShell>
  );
}
