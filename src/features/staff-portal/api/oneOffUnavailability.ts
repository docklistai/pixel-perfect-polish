import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export type OneOffUnavailabilityStatus = "pending" | "approved" | "declined" | "withdrawn";

export interface PortalOneOffUnavailability {
  requestId: string;
  date: string;
  status: OneOffUnavailabilityStatus;
  note: string | null;
  decisionNote: string | null;
  createdAt: string;
}

interface OneOffRow {
  request_id: string;
  date: string;
  status: OneOffUnavailabilityStatus;
  note: string | null;
  decision_note: string | null;
  created_at: string;
}

export async function fetchPortalOneOffUnavailability(
  workspaceId: string,
): Promise<PortalOneOffUnavailability[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("staff_portal_one_off_unavailability")
    .select("request_id, date, status, note, decision_note, created_at")
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data as OneOffRow[] | null) ?? []).map((row) => ({
    requestId: row.request_id,
    date: row.date,
    status: row.status,
    note: row.note,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
  }));
}

export type OneOffWriteResult = { ok: true } | { ok: false; message: string };

function writeError(code: string | null, message: string | null): string {
  if (code === "42501") return "You don't have staff access to manage this request.";
  if (code === "22023") return message ?? "Check the date and note, then try again.";
  if (code === "P0002") return "That request is no longer available.";
  if (code === "55000") return message ?? "That request can no longer be changed here.";
  return "We couldn't save your unavailability request. Please try again.";
}

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).nullable(),
});

export const requestOneOffUnavailabilityFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }): Promise<OneOffWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { error } = await getSupabaseServerClient().rpc("rpc_request_one_off_unavailability", {
      p_workspace_id: data.workspaceId,
      p_date: data.date,
      p_note: data.note,
    });
    return error
      ? { ok: false, message: writeError(error.code ?? null, error.message ?? null) }
      : { ok: true };
  });

const withdrawSchema = z.object({
  workspaceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const withdrawOneOffUnavailabilityFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => withdrawSchema.parse(input))
  .handler(async ({ data }): Promise<OneOffWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { error } = await getSupabaseServerClient().rpc("rpc_withdraw_one_off_unavailability", {
      p_workspace_id: data.workspaceId,
      p_date: data.date,
    });
    return error
      ? { ok: false, message: writeError(error.code ?? null, error.message ?? null) }
      : { ok: true };
  });
