import { useQuery } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchManagerIdentityFn } from "../api/managerIdentity";
import type { WorkspaceRole } from "../types";

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Workspace owner",
  manager: "Workspace manager",
  staff: "Staff",
};

export interface ManagerIdentityView {
  /** Resolved active workspace id, or null while loading/unresolved. */
  workspaceId: string | null;
  /** Real workspace name, or a neutral placeholder while loading/unresolved. */
  workspaceName: string;
  /** Manager email, or null when unresolved. */
  email: string | null;
  /** Raw membership role, or null while loading/unresolved. */
  role: WorkspaceRole | null;
  /** Human role label, or a neutral placeholder. */
  roleLabel: string;
  /** Up-to-two-letter monogram derived from the email local-part. */
  initials: string;
}

function initialsFromEmail(email: string | null): string {
  const local = email?.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = (parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)).toUpperCase();
  return letters || "—";
}

/**
 * Live identity for the manager shell (topbar, sidebar, greeting). Falls back to
 * honest placeholders rather than the old hardcoded "Harbour View Hotel" / "Alex
 * Thompson" demo identity. Safe on every manager route; neutral elsewhere.
 */
export function useManagerIdentity(): ManagerIdentityView {
  const query = useQuery({
    queryKey: ["manager-identity"],
    queryFn: () => fetchManagerIdentityFn(),
    enabled: Boolean(getSupabaseEnv()),
    staleTime: 60_000,
  });

  const data = query.data;
  return {
    workspaceId: data?.workspaceId ?? null,
    workspaceName: data?.workspaceName ?? "Your workspace",
    email: data?.email ?? null,
    role: data?.role ?? null,
    roleLabel: data?.role ? ROLE_LABEL[data.role] : "Workspace manager",
    initials: initialsFromEmail(data?.email ?? null),
  };
}
