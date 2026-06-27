import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeStaffWriteError } from "../lib/addStaff";
import { BULK_STAFF_MAX_ROWS } from "../lib/bulkStaff";
import type { BulkCreateStaffResult, BulkStaffRowResult } from "../types";

/**
 * Manager-side bulk staff create for the paste-list import. Accepts an array of
 * already-validated insert payloads (the client validates via `parseBulkStaff`),
 * re-validates them server-side, and inserts each through the shared
 * {@link insertStaffMember} helper so the bulk path uses the exact same insert
 * authority and RLS as the single Add Staff flow. Rows are inserted
 * independently: one row failing (e.g. a duplicate email) never rolls back the
 * rows that succeeded, and each result is reported back per index.
 */

const bulkStaffSchema = z
  .array(
    z.object({
      display_name: z.string().min(1).max(160),
      email: z.string().email().max(320).nullable(),
      role_name: z.string().min(1).max(120),
      department_id: z.string().uuid().nullable(),
      contract_type: z.enum(["full_time", "part_time", "casual", "fixed_term"]).nullable(),
      contracted_minutes_per_week: z.number().int().min(0).max(10080).nullable(),
    }),
  )
  .min(1)
  .max(BULK_STAFF_MAX_ROWS);

export const createStaffMembersBulkFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bulkStaffSchema.parse(input))
  .handler(async ({ data }): Promise<BulkCreateStaffResult> => {
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

    const results: BulkStaffRowResult[] = [];
    // Sequential inserts keep membership compensation simple and avoid hammering
    // the connection pool; bulk sizes are capped at BULK_STAFF_MAX_ROWS.
    for (let index = 0; index < data.length; index += 1) {
      const outcome = await insertStaffMember(supabase, workspaceId, data[index]!);
      results.push(
        outcome.ok
          ? { index, ok: true, id: outcome.id }
          : { index, ok: false, message: outcome.message },
      );
    }

    const created = results.filter((r) => r.ok).length;
    return { ok: true, results, created, failed: results.length - created };
  });
