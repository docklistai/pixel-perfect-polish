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

const portalRouteApi = getRouteApi("/portal");

/** Local (workspace-facing) yyyy-mm-dd for sensible, non-past default dates. */
function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  const [submitting, setSubmitting] = React.useState(false);

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
  };

  const submit = async () => {
    if (submitting) return;

    if (!liveWorkspaceId) {
      echoToStore();
      close();
      toast.success("Leave request submitted", {
        description: "Your manager can now review it in Docklist.",
      });
      return;
    }

    if (reason.trim().length === 0) {
      toast.error("Add a note", { description: "A short reason is required for your request." });
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
      <FormSection title="Details">
        <FormRow label="Type">
          <select
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
        <FormRow label="From">
          <input
            type="date"
            value={startIso}
            onChange={(event) => setStartIso(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </FormRow>
        <FormRow label="To">
          <input
            type="date"
            value={endIso}
            onChange={(event) => setEndIso(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </FormRow>
        <FormRow label="Note">
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Add a short note about your request"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
