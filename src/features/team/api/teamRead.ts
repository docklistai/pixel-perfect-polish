import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normaliseTeamPage } from "../lib/teamPresentation";
import type { TeamPageData, TeamRosterRow } from "../types";

export const fetchTeamPageFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<TeamPageData> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data, error } = await supabase.rpc("rpc_team_read_page", {
      p_workspace_id: workspaceId,
    });
    if (error || !data) throw new Error("We couldn't load Team.");
    return normaliseTeamPage(data as unknown as Partial<TeamPageData>);
  },
);

const rosterInput = z.object({ announcementId: z.string().uuid() });

interface RosterViewRow {
  display_name: string | null;
  role_name: string | null;
  department_name: string | null;
  delivered_at: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  status: string;
}

/**
 * The acknowledgement roster for exactly one announcement — the scope of the
 * Export control that offers it. Not a reporting surface.
 */
export const fetchTeamAnnouncementRosterFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => rosterInput.parse(input))
  .handler(async ({ data: input }): Promise<TeamRosterRow[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data, error } = await supabase.rpc("rpc_team_export_announcement_roster", {
      p_workspace_id: workspaceId,
      p_announcement_id: input.announcementId,
    });
    if (error) throw new Error("We couldn't prepare that export.");
    return ((data as RosterViewRow[] | null) ?? []).map((row) => ({
      displayName: row.display_name,
      roleName: row.role_name,
      departmentName: row.department_name,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      acknowledgedAt: row.acknowledged_at,
      status: (row.status as TeamRosterRow["status"]) ?? "unread",
    }));
  });
