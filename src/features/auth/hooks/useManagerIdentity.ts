import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchManagerIdentityFn } from "../api/managerIdentity";
import type { WorkspaceRole } from "../types";

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Workspace owner",
  manager: "Workspace manager",
  staff: "Staff",
};

const rootRouteApi = getRouteApi("__root__");

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

const unresolvedIdentity: ManagerIdentityView = {
  workspaceId: null,
  workspaceName: "Your workspace",
  email: null,
  role: null,
  roleLabel: "Workspace manager",
  initials: initialsFromEmail(null),
};

/**
 * Live identity for the manager shell (topbar, sidebar, greeting). Falls back to
 * honest placeholders rather than the old hardcoded "Harbour View Hotel" / "Alex
 * Thompson" demo identity. Safe on every manager route; neutral elsewhere.
 */
export function useManagerIdentity(): ManagerIdentityView {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { auth } = rootRouteApi.useRouteContext();
  const principalId = auth.status === "signed-out" ? null : auth.userId;
  const workspaceId =
    auth.status === "member" || auth.status === "no-staff-profile" ? auth.workspaceId : null;
  const isManager = auth.status === "member" && (auth.role === "owner" || auth.role === "manager");
  const query = useQuery({
    queryKey: ["manager-identity", principalId, workspaceId],
    queryFn: () => fetchManagerIdentityFn(),
    enabled: Boolean(getSupabaseEnv()) && isManager,
    staleTime: 60_000,
  });

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return unresolvedIdentity;
  }

  const data = query.data;
  return {
    ...unresolvedIdentity,
    workspaceId: data?.workspaceId ?? unresolvedIdentity.workspaceId,
    workspaceName: data?.workspaceName ?? unresolvedIdentity.workspaceName,
    email: data?.email ?? unresolvedIdentity.email,
    role: data?.role ?? unresolvedIdentity.role,
    roleLabel: data?.role ? ROLE_LABEL[data.role] : unresolvedIdentity.roleLabel,
    initials: initialsFromEmail(data?.email ?? null),
  };
}
