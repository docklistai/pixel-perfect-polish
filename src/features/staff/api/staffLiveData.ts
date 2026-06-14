import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { StaffRow } from "../types";

/**
 * Manager-side live staff reads. Runs as a server function bound to the
 * caller's session cookie, so workspace RLS (`staff_members_manager_all`)
 * decides what is visible — a manager only ever reads their own workspace's
 * roster. Read-only: this never onboards, edits, or invites. Presentation-only
 * fields the live schema does not carry (avatar, availability, pay) are filled
 * with neutral, deterministic defaults so the existing table renders unchanged.
 */

const workspaceInput = z.object({ workspaceId: z.string().uuid() });

interface StaffMemberRow {
  id: string;
  display_name: string;
  email: string | null;
  role_name: string;
  employment_status: "active" | "inactive" | "left";
  contract_type: "full_time" | "part_time" | "casual" | "fixed_term" | null;
  contracted_minutes_per_week: number | null;
  membership_id: string | null;
  department_id: string | null;
}

const STATUS_LABEL: Record<StaffMemberRow["employment_status"], string> = {
  active: "Active",
  inactive: "Inactive",
  left: "Left",
};

const CONTRACT_LABEL: Record<NonNullable<StaffMemberRow["contract_type"]>, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  casual: "Casual",
  fixed_term: "Fixed-term",
};

/** Stable avatar index (1–70) from the row id, so the same member is consistent. */
function avatarIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 4099;
  return (hash % 70) + 1;
}

function mapStaffRow(row: StaffMemberRow, departmentName: string | null): StaffRow {
  const dept = departmentName ?? "Unassigned";
  const hoursPerWeek = row.contracted_minutes_per_week;
  return {
    id: row.id,
    name: row.display_name,
    n: row.display_name,
    e: row.email ?? "",
    role: row.role_name,
    sub: dept,
    dept,
    status: STATUS_LABEL[row.employment_status],
    contract: row.contract_type ? CONTRACT_LABEL[row.contract_type] : "—",
    hours: hoursPerWeek != null ? `${Math.round(hoursPerWeek / 60)}h/wk` : "—",
    avail: "—",
    availTone: "off",
    img: avatarIndex(row.id),
    active: row.employment_status === "active",
    portalStatus: row.membership_id ? "Claimed" : "Not invited",
  };
}

/**
 * The workspace roster for the signed-in manager, name-ordered. Returns mapped
 * StaffRow records the existing Staff table can render directly.
 */
export const fetchWorkspaceStaffFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data }): Promise<StaffRow[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const [{ data: staff, error: staffError }, { data: departments, error: deptError }] =
      await Promise.all([
        supabase
          .from("staff_members")
          .select(
            "id, display_name, email, role_name, employment_status, contract_type, contracted_minutes_per_week, membership_id, department_id",
          )
          .eq("workspace_id", data.workspaceId)
          .order("display_name", { ascending: true }),
        supabase.from("departments").select("id, name").eq("workspace_id", data.workspaceId),
      ]);

    if (staffError) throw staffError;
    if (deptError) throw deptError;

    const departmentNames = new Map(
      ((departments as { id: string; name: string }[] | null) ?? []).map((d) => [d.id, d.name]),
    );

    return ((staff as StaffMemberRow[] | null) ?? []).map((row) =>
      mapStaffRow(row, row.department_id ? (departmentNames.get(row.department_id) ?? null) : null),
    );
  });
