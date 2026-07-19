import * as React from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { selectActiveWorkspaceFn } from "../api/selectWorkspace";
import { resetIdentityScopedClientState } from "../lib/identityBoundary";
import type { WorkspaceRole } from "../types";

interface SelectableWorkspace {
  workspaceId: string;
  name: string | null;
  role: WorkspaceRole;
}

interface WorkspaceSelectionCardProps {
  workspaces: SelectableWorkspace[];
  onSignOut: () => void | Promise<void>;
  signingOut: boolean;
}

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

/** Lets a user with several active memberships pick their working workspace.
 * Only workspaces returned by the server-resolved auth state are offered. */
export function WorkspaceSelectionCard({
  workspaces,
  onSignOut,
  signingOut,
}: WorkspaceSelectionCardProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState("");
  const [selectingId, setSelectingId] = React.useState<string | null>(null);

  const handleSelect = async (workspace: SelectableWorkspace) => {
    setError("");
    setSelectingId(workspace.workspaceId);
    try {
      const result = await selectActiveWorkspaceFn({
        data: { workspaceId: workspace.workspaceId },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Workspace change is an identity boundary — drop tenant-scoped caches.
      await resetIdentityScopedClientState(queryClient);
      await router.invalidate();
      await navigate({ to: workspace.role === "staff" ? "/portal" : "/" });
    } catch {
      setError("Something went wrong on our end. Please try again.");
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-background/95 p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-brand/10 bg-brand-soft text-brand">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Choose a workspace</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your account belongs to more than one workspace. Pick the one you want to work in —
              you can switch later by signing out and back in.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>Workspace not selected</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ul className="mt-6 space-y-2">
            {workspaces.map((workspace) => (
              <li key={workspace.workspaceId}>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-between px-4 py-3"
                  onClick={() => handleSelect(workspace)}
                  disabled={selectingId !== null}
                >
                  <span className="min-w-0 truncate text-left text-sm font-medium">
                    {workspace.name ?? "Unnamed workspace"}
                  </span>
                  <span className="ml-3 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {ROLE_LABELS[workspace.role]}
                    {selectingId === workspace.workspaceId && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    )}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={onSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
