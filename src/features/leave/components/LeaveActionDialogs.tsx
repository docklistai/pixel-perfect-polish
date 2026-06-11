import * as React from "react";
import { ActionButton, DialogShell, StatusBadge } from "@/components/dl";
import { CalendarDays, Check, Plane, X } from "lucide-react";
import type { LeaveRequest } from "../types";
import { leaveDaysInclusive } from "../lib/leaveDates";
import { buildLeaveRequest, type LeaveStaffOption } from "../lib/leaveRequests";

interface Props {
  decisionRequest: LeaveRequest | null;
  decisionType: "approve" | "decline" | null;
  newRequestOpen: boolean;
  onDecisionOpenChange: (open: boolean) => void;
  onNewRequestOpenChange: (open: boolean) => void;
  onApprove: (id: string, reason: string) => void;
  onDecline: (id: string, reason: string) => void;
  onCreateRequest: (request: LeaveRequest) => void;
}

const staffOptions: LeaveStaffOption[] = [
  { id: "james-walker", name: "James Walker", role: "Waiter", dept: "Front of House", img: 14 },
  { id: "amelia-stone", name: "Amelia Stone", role: "Housekeeper", dept: "Housekeeping", img: 23 },
  { id: "noah-evans", name: "Noah Evans", role: "Porter", dept: "Maintenance", img: 33 },
];

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function LeaveActionDialogs({
  decisionRequest,
  decisionType,
  newRequestOpen,
  onDecisionOpenChange,
  onNewRequestOpenChange,
  onApprove,
  onDecline,
  onCreateRequest,
}: Props) {
  const [staffName, setStaffName] = React.useState(staffOptions[0].name);
  const [startIso, setStartIso] = React.useState("2026-06-12");
  const [endIso, setEndIso] = React.useState("2026-06-14");
  const [leaveType, setLeaveType] = React.useState("Annual leave");
  const [reason, setReason] = React.useState("");
  const [declineReason, setDeclineReason] = React.useState(
    "Coverage on these days is already at risk. Could you suggest the week before or after?",
  );

  const selectedStaff = staffOptions.find((staff) => staff.name === staffName) ?? staffOptions[0];
  const isApprove = decisionType === "approve";
  const decisionOpen = Boolean(decisionRequest && decisionType);

  const handleCreate = () => {
    onCreateRequest(
      buildLeaveRequest({
        staff: selectedStaff,
        startIso,
        endIso,
        type: leaveType,
        reason,
        source: "manager",
      }),
    );
  };

  return (
    <>
      <DialogShell
        open={decisionOpen}
        onOpenChange={onDecisionOpenChange}
        title={
          isApprove
            ? `Approve ${decisionRequest?.n ?? "this request"}'s leave?`
            : "Decline this leave request?"
        }
        description={
          decisionRequest
            ? isApprove
              ? `${decisionRequest.date} · ${decisionRequest.days} days · ${decisionRequest.type}`
              : `${decisionRequest.n} · ${decisionRequest.date}`
            : undefined
        }
        icon={isApprove ? Check : X}
        iconTone={isApprove ? "success" : "danger"}
        footer={
          <>
            <ActionButton variant="secondary" size="sm" onClick={() => onDecisionOpenChange(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              variant={isApprove ? "primary" : "danger"}
              size="sm"
              onClick={() => {
                if (!decisionRequest) return;
                if (isApprove) onApprove(decisionRequest.id, "Approved after coverage review.");
                else onDecline(decisionRequest.id, declineReason);
              }}
            >
              {isApprove ? (
                <>
                  <Check className="h-3 w-3" aria-hidden /> Approve
                </>
              ) : (
                <>
                  <X className="h-3 w-3" aria-hidden /> Decline request
                </>
              )}
            </ActionButton>
          </>
        }
      >
        {decisionRequest && isApprove && (
          <>
            <div className="row gap-3 mb-3">
              <div className="av av-c3">{initials(decisionRequest.n)}</div>
              <div>
                <div className="strong">{decisionRequest.n}</div>
                <div className="muted txt-sm">{decisionRequest.role}</div>
              </div>
            </div>
            <div className="card" style={{ background: "var(--bg-raised)" }}>
              <div className="card-section space-y-2">
                <div className="row justify-between">
                  <span className="muted txt-sm">Coverage impact</span>
                  <StatusBadge tone={decisionRequest.tone} dot>
                    {decisionRequest.impact}
                  </StatusBadge>
                </div>
                <div className="row justify-between">
                  <span className="muted txt-sm">Days remaining after</span>
                  <span className="strong mono">11 / 28</span>
                </div>
                <div className="row justify-between">
                  <span className="muted txt-sm">Other staff off these days</span>
                  <span className="strong">2 already approved</span>
                </div>
              </div>
            </div>
            <p className="muted txt-sm mt-3">
              Approved leave is included in rota conflict checks. Portal staff receive a staff-safe
              decision update automatically.
            </p>
          </>
        )}

        {decisionRequest && !isApprove && (
          <>
            <p className="muted txt-sm mb-3">
              {decisionRequest.n} will see your reason in their staff app preview. They can request
              again with a new date.
            </p>
            <div className="field">
              <label htmlFor="leave-decline-reason">Reason for decline</label>
              <textarea
                id="leave-decline-reason"
                className="dl-textarea"
                rows={3}
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
              />
            </div>
          </>
        )}
      </DialogShell>

      <DialogShell
        open={newRequestOpen}
        onOpenChange={onNewRequestOpenChange}
        title="New leave request"
        description="On behalf of a team member"
        icon={Plane}
        iconTone="purple"
        size="lg"
        footer={
          <>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => onNewRequestOpenChange(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton size="sm" onClick={handleCreate}>
              <Check className="h-3 w-3" aria-hidden /> Create request
            </ActionButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label htmlFor="leave-staff-member">Staff member</label>
            <select
              id="leave-staff-member"
              className="dl-select"
              value={staffName}
              onChange={(event) => setStaffName(event.target.value)}
            >
              {staffOptions.map((staff) => (
                <option key={staff.name}>{staff.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="leave-type">Leave type</label>
            <select
              id="leave-type"
              className="dl-select"
              value={leaveType}
              onChange={(event) => setLeaveType(event.target.value)}
            >
              <option>Annual leave</option>
              <option>Sick leave</option>
              <option>Compassionate</option>
              <option>Unpaid</option>
              <option>Maternity / paternity</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="leave-days">Days</label>
            <input
              id="leave-days"
              className="dl-input mono"
              value={leaveDaysInclusive(startIso, endIso)}
              readOnly
            />
          </div>
          <div className="field">
            <label htmlFor="leave-from">From</label>
            <div className="input-group">
              <CalendarDays className="ico h-3.5 w-3.5" aria-hidden />
              <input
                id="leave-from"
                className="mono"
                type="date"
                value={startIso}
                onChange={(event) => setStartIso(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="leave-to">To</label>
            <div className="input-group">
              <CalendarDays className="ico h-3.5 w-3.5" aria-hidden />
              <input
                id="leave-to"
                className="mono"
                type="date"
                value={endIso}
                onChange={(event) => setEndIso(event.target.value)}
              />
            </div>
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="leave-reason">Reason (optional)</label>
            <textarea
              id="leave-reason"
              className="dl-textarea"
              rows={2}
              placeholder="Add a note for the team..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <p className="muted txt-sm mt-3">
          The request stays pending until approved; approved dates then appear in rota checks.
        </p>
      </DialogShell>
    </>
  );
}
