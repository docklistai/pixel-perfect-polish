import * as React from "react";
import { CircleAlert, ExternalLink, Lightbulb, TrendingUp, UserPlus } from "lucide-react";
import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import type { LeaveRequest } from "@/features/leave/types";
import type { DraftShift, StaffMember, ShiftId } from "../types";
import { buildRotaRecoveryOptions, NO_SAFE_RECOVERY_OPTIONS } from "../lib/rotaRecoveryOptions";
import type { RotaIssue } from "../lib/rotaIssues";

/** Drawer with Problem / Suggested fix / Impact rows for a rota issue (prototype "View fix & actions"). */
export function IssueDetailDrawer({
  issue,
  reviewed,
  onClose,
  onMarkReviewed,
  onReviewShift,
  draftShifts,
  assignableStaff,
  leaveRequests,
  dayIsoDates,
  onChooseRecoveryCandidate,
}: {
  issue: RotaIssue | null;
  reviewed: boolean;
  onClose: () => void;
  onMarkReviewed: (issue: RotaIssue) => void;
  onReviewShift: (shiftId: ShiftId) => void;
  draftShifts: DraftShift[];
  assignableStaff: StaffMember[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
  onChooseRecoveryCandidate: (shiftId: ShiftId, staffId: string) => void;
}) {
  const sections = issue
    ? [
        {
          label: "Problem",
          icon: CircleAlert,
          bubble: "bg-danger-soft text-danger",
          body: issue.why,
        },
        {
          label: "Suggested fix",
          icon: Lightbulb,
          bubble: "bg-brand-soft text-brand",
          body: issue.fix,
        },
        {
          label: "Impact",
          icon: TrendingUp,
          bubble: "bg-info-soft text-info",
          body: issue.impact,
        },
      ]
    : [];
  const recoveryShift =
    issue?.shiftId === undefined
      ? null
      : (draftShifts.find((shift) => shift.id === issue.shiftId) ?? null);
  const recoveryOptions = React.useMemo(() => {
    if (!recoveryShift) return [];
    return buildRotaRecoveryOptions({
      shift: recoveryShift,
      staff: assignableStaff,
      shifts: draftShifts,
      leaveRequests,
      dayIsoDates,
      excludeStaffId: recoveryShift.staffId,
    });
  }, [assignableStaff, dayIsoDates, draftShifts, leaveRequests, recoveryShift]);

  return (
    <DrawerShell
      open={issue !== null}
      onOpenChange={(open) => !open && onClose()}
      title={issue?.title ?? ""}
      description="Source: Rota draft - this week"
      meta={
        issue && (
          <StatusBadge tone={reviewed ? "muted" : issue.tone === "danger" ? "danger" : "warning"}>
            {reviewed ? "Seen this session" : "Needs attention"}
          </StatusBadge>
        )
      }
      footer={
        issue && (
          <>
            <ActionButton variant="ghost" size="sm" onClick={onClose}>
              Close
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => onMarkReviewed(issue)}>
              Mark seen
            </ActionButton>
          </>
        )
      }
    >
      {issue && (
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.label}
              className="flex items-start gap-3 rounded-[10px] border border-border bg-muted/30 px-3.5 py-3"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${section.bubble}`}
                aria-hidden
              >
                <section.icon className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </div>
                <div className="mt-1 text-sm leading-relaxed">{section.body}</div>
              </div>
            </div>
          ))}

          {recoveryShift && (
            <div className="rounded-[10px] border border-border bg-muted/25 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recovery options
              </div>
              {recoveryOptions.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {recoveryOptions.map((option) => (
                    <div
                      key={option.staffId}
                      className="flex items-start justify-between gap-3 rounded-[8px] border border-border bg-background px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{option.staffName}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {option.note}
                        </div>
                      </div>
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        icon={UserPlus}
                        onClick={() => {
                          onChooseRecoveryCandidate(recoveryShift.id, option.staffId);
                          onClose();
                        }}
                      >
                        Open &amp; use
                      </ActionButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{NO_SAFE_RECOVERY_OPTIONS}</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                This only preloads the shift drawer. Save is still required.
              </p>
            </div>
          )}

          <div className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Actions
          </div>
          <div className="space-y-2">
            {issue.shiftId && (
              <ActionButton
                variant="secondary"
                size="sm"
                icon={ExternalLink}
                className="w-full justify-start"
                onClick={() => onReviewShift(issue.shiftId!)}
              >
                Open affected shift
              </ActionButton>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            This marker only lives in the current view.
          </p>
        </div>
      )}
    </DrawerShell>
  );
}
