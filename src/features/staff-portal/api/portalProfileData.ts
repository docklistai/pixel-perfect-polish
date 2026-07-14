import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

interface ProfileViewRow {
  staff_member_id: string;
  display_name: string;
  role_name: string;
  department_name: string | null;
  workspace_name: string | null;
  email: string | null;
  phone: string | null;
  employment_status: string;
  timezone: string | null;
}

export async function fetchPortalProfile(workspaceId: string, staffMemberId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_profile")
    .select(
      "staff_member_id, display_name, role_name, department_name, workspace_name, email, phone, employment_status, timezone",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .single();

  if (error) throw error;
  const row = data as ProfileViewRow;
  const parts = row.display_name.trim().split(" ");
  const initials =
    parts.length > 1
      ? `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase()
      : `${parts[0]![0]!}`.toUpperCase();

  return {
    staffId: row.staff_member_id,
    name: row.display_name,
    initials,
    role: row.role_name,
    department: row.department_name ?? "Unassigned",
    workspaceName: row.workspace_name ?? "Your workspace",
    email: row.email ?? "",
    phone: row.phone ?? "",
    accessStatus: "active" as const,
    manager: { name: "Your Manager", email: "", phone: "" },
    timezone: row.timezone ?? "UTC",
  };
}
