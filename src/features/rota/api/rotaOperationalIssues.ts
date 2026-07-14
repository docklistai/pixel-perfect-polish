import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface RotaOperationalIssue {
  id: string;
  leaveRequestId: string;
  triggerStatus: "approved" | "cancelled";
  openedAt: string;
  staffName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
}

const inputSchema = z.object({ rotaWeekId: z.string().uuid() });

export const fetchRotaOperationalIssuesFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<RotaOperationalIssue[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data: issueData, error: issueError } = await supabase
      .from("rota_operational_issues")
      .select("id, leave_request_id, trigger_status, opened_at")
      .eq("workspace_id", workspaceId)
      .eq("rota_week_id", data.rotaWeekId)
      .eq("status", "open")
      .order("opened_at", { ascending: false });
    if (issueError) throw issueError;
    const issues =
      (issueData as Array<{
        id: string;
        leave_request_id: string;
        trigger_status: "approved" | "cancelled";
        opened_at: string;
      }> | null) ?? [];
    if (issues.length === 0) return [];

    const { data: leaveData, error: leaveError } = await supabase
      .from("leave_requests")
      .select("id, staff_member_id, start_date, end_date, leave_type")
      .eq("workspace_id", workspaceId)
      .in(
        "id",
        issues.map((issue) => issue.leave_request_id),
      );
    if (leaveError) throw leaveError;
    const leaveRows =
      (leaveData as Array<{
        id: string;
        staff_member_id: string;
        start_date: string;
        end_date: string;
        leave_type: string;
      }> | null) ?? [];
    if (leaveRows.length === 0) return [];
    const staffIds = [...new Set(leaveRows.map((leave) => leave.staff_member_id))];
    const { data: staffData, error: staffError } = await supabase
      .from("staff_members")
      .select("id, display_name")
      .eq("workspace_id", workspaceId)
      .in("id", staffIds);
    if (staffError) throw staffError;
    const leaveById = new Map(leaveRows.map((leave) => [leave.id, leave]));
    const staffById = new Map(
      ((staffData as Array<{ id: string; display_name: string }> | null) ?? []).map((staff) => [
        staff.id,
        staff.display_name,
      ]),
    );
    return issues.flatMap((issue) => {
      const leave = leaveById.get(issue.leave_request_id);
      if (!leave) return [];
      return [
        {
          id: issue.id,
          leaveRequestId: issue.leave_request_id,
          triggerStatus: issue.trigger_status,
          openedAt: issue.opened_at,
          staffName: staffById.get(leave.staff_member_id) ?? "Team member",
          startDate: leave.start_date,
          endDate: leave.end_date,
          leaveType: leave.leave_type,
        },
      ];
    });
  });
