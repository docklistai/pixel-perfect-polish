import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { OpsPageData } from "../types";

const nullableUuid = z.string().uuid().nullable().optional();
const readInput = z.object({
  search: z.string().trim().max(200).default(""),
  entryType: z.enum(["task", "incident", "maintenance", "service_request", "note"]).nullable(),
  status: z.enum(["open", "in_progress", "resolved", "archived"]).nullable(),
  priority: z.enum(["low", "normal", "high", "critical"]).nullable(),
  locationId: nullableUuid,
  tab: z.enum(["timeline", "briefings", "tasks", "incidents", "checks"]),
  sort: z.enum(["time_desc", "time_asc", "priority_desc", "status_asc"]),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  selectedEntryId: nullableUuid,
});

export type OpsReadInput = z.infer<typeof readInput>;

export const fetchOpsPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => readInput.parse(input))
  .handler(async ({ data }): Promise<OpsPageData> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data: page, error } = await supabase.rpc("rpc_ops_read_page", {
      p_workspace_id: workspaceId,
      p_search: data.search || null,
      p_entry_type: data.entryType,
      p_status: data.status,
      p_priority: data.priority,
      p_location_id: data.locationId ?? null,
      p_tab: data.tab,
      p_sort: data.sort,
      p_page: data.page,
      p_page_size: data.pageSize,
      p_selected_entry_id: data.selectedEntryId ?? null,
    });
    if (error || !page) throw new Error("We couldn't load the operational log.");
    return page as unknown as OpsPageData;
  });
