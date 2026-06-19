import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeStaffWriteError } from "../lib/addStaff";
import type { CreateStaffMemberResult } from "../types";

/**
 * Manager-side live staff create. Runs as a server function bound to the
 * caller's session cookie. The active manager workspace is resolved server-side
 * and stamped onto the insert — `workspace_id` is never trusted from the client.
 * The write goes through the caller's session, so the `staff_members` manager
 * RLS policy is the authority; this adds no schema, RLS, or RPC surface. It
 * creates only the lightweight staff identity: no portal membership is created
 * and no portal code is issued (those remain separate, explicit actions).
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
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeStaffWriteError("42501") };
    }

    // Defensive re-normalisation; the client already trims/lowercases, but the
    // server must not rely on that. employment_status defaults to 'active'.
    const { data: inserted, error } = await supabase
      .from("staff_members")
      .insert({
        workspace_id: workspaceId,
        display_name: data.display_name.trim(),
        email: data.email ? data.email.trim().toLowerCase() : null,
        role_name: data.role_name.trim(),
        department_id: data.department_id,
        contract_type: data.contract_type,
        contracted_minutes_per_week: data.contracted_minutes_per_week,
        employment_status: "active",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { ok: false, message: describeStaffWriteError(error?.code ?? null) };
    }
    return { ok: true, id: (inserted as { id: string }).id };
  });
