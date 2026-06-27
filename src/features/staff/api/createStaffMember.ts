import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeStaffWriteError } from "../lib/addStaff";
import type { CreateStaffMemberResult } from "../types";

/**
 * Manager-side live staff create. Runs as a server function bound to the
 * caller's session cookie. The active manager workspace is resolved server-side
 * and stamped onto the insert — `workspace_id` is never trusted from the client.
 * The two writes are delegated to {@link insertStaffMember}, which the bulk
 * paste-list import shares, so both paths use one insert authority. This adds no
 * schema, RLS, or RPC surface — the existing manager RLS policies remain the
 * authority.
 */

const createStaffSchema = z.object({
  display_name: z.string().min(1).max(160),
  email: z.string().email().max(320).nullable(),
  role_name: z.string().min(1).max(120),
  department_id: z.string().uuid().nullable(),
  contract_type: z.enum(["full_time", "part_time", "casual", "fixed_term"]).nullable(),
  contracted_minutes_per_week: z.number().int().min(0).max(10080).nullable(),
});

export const createStaffMemberFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createStaffSchema.parse(input))
  .handler(async ({ data }): Promise<CreateStaffMemberResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const { insertStaffMember } = await import("./insertStaffMember");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeStaffWriteError("42501") };
    }

    return insertStaffMember(supabase, workspaceId, data);
  });
