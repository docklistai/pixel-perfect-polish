export type WorkspaceRole = "owner" | "manager" | "staff";

/**
 * Resolved authentication + membership state for the current session.
 * `member` is the only state that grants access to workspace routes; role
 * decides manager surface vs staff portal. Domain data stays on the demo
 * WorkspaceStore until Phase 7.
 */
export type AuthState =
  | { status: "signed-out" }
  | { status: "no-workspace"; userId: string; email: string | null }
  | {
      /**
       * Authenticated user with several active memberships and no explicit
       * choice. We never silently pick one — the caller must select a workspace
       * (or is routed to a safe no-access state) so role/scoping stays explicit.
       */
      status: "workspace-selection-required";
      userId: string;
      email: string | null;
      workspaces: Array<{ workspaceId: string; role: WorkspaceRole }>;
    }
  | {
      status: "no-staff-profile";
      userId: string;
      email: string | null;
      workspaceId: string;
      membershipId: string;
    }
  | {
      status: "member";
      userId: string;
      email: string | null;
      workspaceId: string;
      membershipId: string;
      role: WorkspaceRole;
      staffMemberId: string | null;
    };

export type ClaimPortalAccessResult = { ok: true } | { ok: false; message: string };
