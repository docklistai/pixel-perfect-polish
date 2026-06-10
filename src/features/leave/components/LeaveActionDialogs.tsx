import * as React from "react";
import { ActionButton, DialogShell, StatusBadge } from "@/components/dl";
import { CalendarDays, Check, Plane, X } from "lucide-react";
import type { LeaveRequest } from "../types";

interface StaffOption {
  name: string;
  role: string;
  dept: string;
  img: number;
}

interface Props {
  decisionRequest: LeaveRequest | null;
  decisionType: "approve" | "decline" | null;
  newRequestOpen: boolean;
  onDecisionOpenChange: (open: boolean) => void;
  onNewRequestOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onCreateRequest: (request: LeaveRequest) => void;
}

const staffOptions: StaffOption[] = [
  { name: "Isabella Martin", role: "Supervisor", dept: "Front of House", img: 16 },
  { name: "Amelia Stone", role: "Room Attendant", dept: "Housekeeping", img: 23 },
  { name: "Oliver Bennett", role: "Chef de Partie", dept: "Kitchen", img: 28 },
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
  const [days, setDays] = React.useState("3");

  const selectedStaff = staffOptions.find((staff) => staff.name === staffName) ?? staffOptions[0];
  const isApprove = decisionType === "approve";
  const decisionOpen = Boolean(decisionRequest && decisionType);

  const handleCreate = () => {
    const parsedDays = Number.parseInt(days, 10);
    const safeDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 3;

    onCreateRequest({
      id: `new-${Date.now()}`,
      n: selectedStaff.name,
      role: selectedStaff.role,
      dept: selectedStaff.dept,
      date: "22 – 24 May 2025",
      days: safeDays,
      type: "Annual leave",
      impact: "Low",
      tone: "success",
      state: "approved",
      notice: 10,
      reason: "Added by manager.",
      img: selectedStaff.img,
      balance: "11 / 28 days",
      submitted: "Created just now",
      coverNote: "Created by manager from the leave screen.",
    });
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
                if (isApprove) onApprove(decisionRequest.id);
                else onDecline(decisionRequest.id);
              }}
            >
              {isApprove ? (
                <>
                  <Check className="h-3 w-3" aria-hidden /> Approve & notify
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
            <label className="row gap-2 mt-3 txt-sm">
              <input type="checkbox" defaultChecked /> Prepare a staff-app update for{" "}
              {decisionRequest.n}
            </label>
            <label className="row gap-2 mt-2 txt-sm">
              <input type="checkbox" /> Mark these days as unavailable on the rota
            </label>
          </>
        )}

        {decisionRequest && !isApprove && (
          <>
            <p className="muted txt-sm mb-3">
              {decisionRequest.n} will receive a notification with your reason. They can request
              again with a new date.
            </p>
            <div className="field">
              <label htmlFor="leave-decline-reason">Reason for decline</label>
              <textarea
                id="leave-decline-reason"
                className="dl-textarea"
                rows={3}
                defaultValue="Coverage on these days is already at risk. Could you suggest the week before or after?"
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
            <select id="leave-type" className="dl-select" defaultValue="Annual leave">
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
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="leave-from">From</label>
            <div className="input-group">
              <CalendarDays className="ico h-3.5 w-3.5" aria-hidden />
              <input id="leave-from" className="mono" defaultValue="22 May 2025" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="leave-to">To</label>
            <div className="input-group">
              <CalendarDays className="ico h-3.5 w-3.5" aria-hidden />
              <input id="leave-to" className="mono" defaultValue="24 May 2025" />
            </div>
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="leave-reason">Reason (optional)</label>
            <textarea
              id="leave-reason"
              className="dl-textarea"
              rows={2}
              placeholder="Add a note for the team..."
            />
          </div>
        </div>
        <label className="row gap-2 mt-3 txt-sm">
          <input type="checkbox" defaultChecked /> Mark these days as unavailable on the rota
        </label>
      </DialogShell>
    </>
  );
}
