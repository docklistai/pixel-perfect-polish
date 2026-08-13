import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normaliseReportsPage } from "../lib/reportsNormalizer";
import type { ReportsPageData } from "../types";

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const optionalUuid = z.string().uuid().nullable();
const reportsReadInput = z
  .object({
    periodStart: optionalDate,
    periodEnd: optionalDate,
    locationId: optionalUuid,
    departmentId: optionalUuid,
  })
  .strict();

export type ReportsReadInput = z.infer<typeof reportsReadInput>;

export const fetchReportsPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => reportsReadInput.parse(input))
  .handler(async ({ data }): Promise<ReportsPageData> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data: page, error } = await supabase.rpc("rpc_reports_read_page", {
      p_workspace_id: workspaceId,
      p_period_start: data.periodStart,
      p_period_end: data.periodEnd,
      p_location_id: data.locationId,
      p_department_id: data.departmentId,
    });
    if (error || !page) throw new Error("We couldn't load Reports.");
    try {
      return normaliseReportsPage(page);
    } catch {
      throw new Error("Reports returned an invalid data shape.");
    }
  });
