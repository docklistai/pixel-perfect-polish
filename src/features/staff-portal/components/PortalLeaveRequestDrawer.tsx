import * as React from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActionButton, DrawerShell, FormRow, FormSection } from "@/components/dl";
import { createLeaveRequest } from "@/features/demo/store/leaveActions";
import { useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import {
  buildLeaveManagerNotification,
  buildLeaveRequest,
  type LeaveStaffOption,
} from "@/features/leave/lib/leaveRequests";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { usePortalProfile } from "../hooks/usePortalProfile";
import { submitLeaveRequestFn } from "../api/portalActions";
import {
  localIsoDate,
  validatePortalLeaveRequest,
  type PortalLeaveValidationError,
} from "../lib/portalLeaveValidation";

const portalRouteApi = getRouteApi("/portal");

/** Local (workspace-facing) yyyy-mm-dd for sensible, non-past default dates. */
/** UI leave-type labels → the RPC's `leave_type` enum. */
const LEAVE_TYPE_TO_RPC: Record<string, "annual_leave" | "personal" | "sick" | "unpaid" | "other"> =
  {
    "Annual leave": "annual_leave",
    "Sick leave": "sick",
    "Compassionate leave": "personal",
    "Unpaid leave": "unpaid",
  };

export function PortalLeaveRequestDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = useWorkspaceStore();
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const [startIso, setStartIso] = React.useState(() => localIsoDate(new Date()));
  const [endIso, setEndIso] = React.useState(() => localIsoDate(new Date()));
  const [leaveType, setLeaveType] = React.useState("Annual leave");
  const [reason, setReason] = React.useState("");
  const [validationError, setValidationError] = React.useState<PortalLeaveValidationError | null>(
    null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);

  // Live submissions persist through the RPC; the demo path mutates the
  // WorkspaceStore so the Harbour View playground keeps working offline.
  const liveWorkspaceId =
    Boolean(getSupabaseEnv()) && auth.status === "member" && auth.role === "staff"
      ? auth.workspaceId
      : null;

  const { data: profile } = usePortalProfile();

  const portalStaff: LeaveStaffOption | null = profile
    ? {
        id: profile.staffId,
        name: profile.name,
        role: profile.role,
        dept: profile.department,
        img: 16,
      }
    : liveWorkspaceId
      ? null
      : {
          id: "olivia-bennett",
          name: "Team member",
          role: "Staff",
          dept: "Front of House",
          img: 16,
        };

  const echoToStore = () => {
    if (!portalStaff) return;
    const request = buildLeaveRequest({
      staff: portalStaff,
      startIso,
      endIso,
      type: leaveType,
      reason,
      source: "portal",
    });
    createLeaveRequest(store, request, buildLeaveManagerNotification(request));
  };

  const close = () => {
    onOpenChange(false);
    setReason("");
    setValidationError(null);
  };

  const submit = async () => {
    if (submitting) return;

    const nextValidationError = validatePortalLeaveRequest({
      startIso,
      endIso,
      todayIso: localIsoDate(new Date()),
      reason,
    });
    if (nextValidationError) {
      setValidationError(nextValidationError);
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    setValidationError(null);

    if (!liveWorkspaceId) {
      echoToStore();
      close();
      toast.success("Leave request submitted", {
        description: "Your manager can now review it in Docklist.",
      });
      return;
    }

    if (!profile) {
      toast.error("Profile not loaded", { description: "Please wait a moment and try again." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLeaveRequestFn({
        data: {
          workspaceId: liveWorkspaceId,
          leaveType: LEAVE_TYPE_TO_RPC[leaveType] ?? "other",
          startDate: startIso,
          endDate: endIso,
          reason: reason.trim(),
        },
      });

      if (!result.ok) {
        toast.error("Couldn't submit request", { description: result.message });
        return;
      }

      // Reflect the persisted request in the local history list immediately.
      echoToStore();
      void queryClient.invalidateQueries({ queryKey: ["portal", "leave-requests"] });
      close();
      toast.success("Leave request submitted", {
        description: "Your manager can now review it in Docklist.",
      });
    } catch (error) {
      console.error("submitLeaveRequestFn failed:", error);
      toast.error("Couldn't submit request", { description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="New time-off request"
      description="Your request stays pending until a manager reviews it."
      width="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </ActionButton>
        </>
      }
    >
      {validationError && (
        <div
          ref={errorSummaryRef}
          id="portal-leave-error-summary"
          role="alert"
          tabIndex={-1}
          className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          Check your request: {validationError.message}
        </div>
      )}
      <FormSection title="Details">
        <FormRow label="Type" htmlFor="portal-leave-type">
          <select
            id="portal-leave-type"
            value={leaveType}
            onChange={(event) => setLeaveType(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option>Annual leave</option>
            <option>Sick leave</option>
            <option>Compassionate leave</option>
            <option>Unpaid leave</option>
          </select>
        </FormRow>
        <FormRow label="From" htmlFor="portal-leave-from">
          <input
            id="portal-leave-from"
            type="date"
            value={startIso}
            min={localIsoDate(new Date())}
            onChange={(event) => {
              setStartIso(event.target.value);
              setValidationError(null);
            }}
            required
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            aria-invalid={validationError?.field === "dates"}
            aria-describedby={
              validationError?.field === "dates" ? "portal-leave-date-error" : undefined
            }
          />
        </FormRow>
        <FormRow label="To" htmlFor="portal-leave-to">
          <input
            id="portal-leave-to"
            type="date"
            value={endIso}
            min={startIso || localIsoDate(new Date())}
            onChange={(event) => {
              setEndIso(event.target.value);
              setValidationError(null);
            }}
            required
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            aria-invalid={validationError?.field === "dates"}
            aria-describedby={
              validationError?.field === "dates" ? "portal-leave-date-error" : undefined
            }
          />
          {validationError?.field === "dates" && (
            <p id="portal-leave-date-error" className="text-[11px] text-danger">
              {validationError.message}
            </p>
          )}
        </FormRow>
        <FormRow label="Note" htmlFor="portal-leave-note">
          <textarea
            id="portal-leave-note"
            rows={3}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (validationError?.field === "reason") setValidationError(null);
            }}
            placeholder="Add a short note about your request"
            required
            aria-invalid={validationError?.field === "reason"}
            aria-describedby={
              validationError?.field === "reason" ? "portal-leave-reason-error" : undefined
            }
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          {validationError?.field === "reason" && (
            <p id="portal-leave-reason-error" className="text-[11px] text-danger">
              {validationError.message}
            </p>
          )}
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
