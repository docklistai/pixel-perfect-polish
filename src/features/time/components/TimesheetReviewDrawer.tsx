import { Bell, Check, Clock, Edit3, User, X } from "lucide-react";
import { DrawerShell, FormSection, FormRow, StatusBadge, ActionButton } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { TimesheetRow } from "../types";
import type { TimesheetStatus } from "./TimesheetTable";

interface Props {
  row: TimesheetRow | null;
  statusOf: (row: TimesheetRow) => TimesheetStatus;
  onApprove: (row: TimesheetRow) => void;
  onRevert: (row: TimesheetRow) => void;
  onAdjust: (row: TimesheetRow) => void;
  onClose: () => void;
}

const deltaTone = (tone?: "warning" | "danger") =>
  tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-success";

export function TimesheetReviewDrawer({
  row,
  statusOf,
  onApprove,
  onRevert,
  onAdjust,
  onClose,
}: Props) {
  if (!row) return null;

  const status = statusOf(row);
  const badgeTone =
    status === "approved"
      ? ("success" as const)
      : status === "unapproved"
        ? ("danger" as const)
        : ("warning" as const);
  const badgeLabel =
    status === "approved" ? "Approved" : status === "unapproved" ? "Unapproved" : "Pending";

  const clockedRows = [
    { label: "Scheduled", value: row.sched, cls: "text-muted-foreground" },
    { label: "Clocked in", value: `${row.in} (${row.inN})`, cls: deltaTone(row.inTone) },
    { label: "Clocked out", value: `${row.out} (${row.outN})`, cls: deltaTone(row.outTone) },
    { label: "Breaks (unpaid)", value: row.brk, cls: "text-muted-foreground" },
    { label: "Paid hours", value: row.paid, cls: "font-semibold text-brand" },
  ];

  const auditTrail = [
    { time: "Tue 13:24", title: "Manager opened entry", body: "Alex Thompson", icon: User },
    { time: "Mon 16:07", title: "Clocked out", body: `at ${row.out}`, icon: Clock },
    { time: "Mon 07:58", title: "Clocked in", body: `at ${row.in}`, icon: Clock },
    {
      time: "Mon 06:30",
      title: "Reminder prepared",
      body: "15 min before scheduled start",
      icon: Bell,
    },
  ];

  return (
    <DrawerShell
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title={`${row.n} — Week of 8 Jun 2026`}
      description={`${row.role} · Harbour View Hotel`}
      meta={
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge tone={badgeTone}>{badgeLabel}</StatusBadge>
          {row.exc !== "—" && <StatusBadge tone="danger">{row.exc}</StatusBadge>}
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
            <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Adjust
          </ActionButton>
          {status !== "approved" ? (
            <ActionButton
              onClick={() => {
                onApprove(row);
                onClose();
              }}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
            </ActionButton>
          ) : (
            <ActionButton
              variant="secondary"
              onClick={() => {
                onRevert(row);
                onClose();
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Revert
            </ActionButton>
          )}
        </>
      }
    >
      <FormSection title="Clocked time">
        <div className="divide-y divide-border">
          {clockedRows.map((c) => (
            <div key={c.label} className="flex items-center justify-between py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className={cn("text-sm font-semibold font-mono", c.cls)}>{c.value}</span>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Audit trail">
        <div className="relative pl-5">
          <span className="absolute bottom-1 left-[7px] top-1 w-px bg-border" aria-hidden />
          {auditTrail.map((e) => (
            <div key={e.title} className="relative flex items-start gap-3 py-2">
              <span
                className="absolute -left-5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand/40 bg-card text-brand"
                aria-hidden
              >
                <e.icon className="h-2 w-2" />
              </span>
              <div className="min-w-0 flex-1 pl-2">
                <div className="text-sm font-semibold">{e.title}</div>
                <div className="text-[11px] text-muted-foreground">{e.body}</div>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">{e.time}</span>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Manager note" description="Saved with the timesheet for the audit log.">
        <FormRow label="Add a note" htmlFor="time-manager-note">
          <textarea
            id="time-manager-note"
            className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Optional. Saved with the timesheet for the audit log…"
          />
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
