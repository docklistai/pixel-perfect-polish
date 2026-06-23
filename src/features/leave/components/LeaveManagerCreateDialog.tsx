import * as React from "react";
import { ActionButton, DialogShell } from "@/components/dl";
import { CalendarDays, Check, Plane } from "lucide-react";
import type { LeaveRequest, LeaveSource } from "../types";
import { leaveDaysInclusive } from "../lib/leaveDates";
import { buildLeaveRequest } from "../lib/leaveRequests";
import {
  demoManagerCreateStaffOptions,
  managerCreateDialogState,
} from "../lib/leaveActionDialogContent";

interface Props {
  source: LeaveSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRequest: (request: LeaveRequest) => void;
}

export function LeaveManagerCreateDialog({ source, open, onOpenChange, onCreateRequest }: Props) {
  const dialogState = managerCreateDialogState(source);
  const [staffName, setStaffName] = React.useState(demoManagerCreateStaffOptions[0].name);
  const [startIso, setStartIso] = React.useState("2026-06-12");
  const [endIso, setEndIso] = React.useState("2026-06-14");
  const [leaveType, setLeaveType] = React.useState("Annual leave");
  const [reason, setReason] = React.useState("");

  const selectedStaff =
    demoManagerCreateStaffOptions.find((staff) => staff.name === staffName) ??
    demoManagerCreateStaffOptions[0];

  const handleCreate = () => {
    if (!dialogState.canCreate) return;
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
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="New leave request"
      description={dialogState.description}
      icon={Plane}
      iconTone="purple"
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          {dialogState.canCreate && (
            <ActionButton size="sm" onClick={handleCreate}>
              <Check className="h-3 w-3" aria-hidden /> Create request
            </ActionButton>
          )}
        </>
      }
    >
      {dialogState.canCreate ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label htmlFor="leave-staff-member">Staff member</label>
              <select
                id="leave-staff-member"
                className="dl-select"
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
              >
                {demoManagerCreateStaffOptions.map((staff) => (
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
        </>
      ) : (
        <div className="card" style={{ background: "var(--bg-raised)" }}>
          <div className="card-section space-y-2">
            <div className="strong">{dialogState.unavailableTitle}</div>
            <p className="muted txt-sm" style={{ lineHeight: 1.55 }}>
              {dialogState.unavailableBody}
            </p>
          </div>
        </div>
      )}
    </DialogShell>
  );
}
