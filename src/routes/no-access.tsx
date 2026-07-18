import * as React from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BootstrapWorkspaceForm } from "@/features/auth/components/BootstrapWorkspaceForm";
import { WorkspaceSelectionCard } from "@/features/auth/components/WorkspaceSelectionCard";
import { clearAuthStateCache, requireNoWorkspaceState } from "@/features/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export const Route = createFileRoute("/no-access")({
  beforeLoad: ({ context }) => requireNoWorkspaceState(context.auth),
  head: () => ({ meta: [{ title: "No workspace access — Docklist" }] }),
  component: NoAccessPage,
});

function NoAccessPage() {
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
    } catch {
      toast.error("Sign-out failed", { description: "Please try again." });
      setSigningOut(false);
      return;
    }
    clearAuthStateCache();
    await router.invalidate();
    await navigate({ to: "/auth" });
  };

  if (auth.status === "no-workspace" && !auth.isAnonymous) {
    return (
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <BootstrapWorkspaceForm onSignOut={handleSignOut} signingOut={signingOut} />
      </main>
    );
  }

  if (auth.status === "workspace-selection-required") {
    return (
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <WorkspaceSelectionCard
          workspaces={auth.workspaces}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center bg-background px-4 focus:outline-none"
    >
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          You don't have workspace access yet
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your account isn't linked to complete workspace access yet. Ask an owner or manager to
          check your membership and staff profile. Staff can use access codes if they still need to
          claim their membership.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/portal/access">I have access codes</Link>
          </Button>
          <Button variant="ghost" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>
    </main>
  );
}
