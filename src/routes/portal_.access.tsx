import * as React from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAuthStateCache, redirectActiveMembers } from "@/features/auth";
import { claimPortalAccessFn } from "@/features/auth/api/portalClaim";

export const Route = createFileRoute("/portal_/access")({
  beforeLoad: ({ context }) => redirectActiveMembers(context.auth),
  head: () => ({
    meta: [
      { title: "Staff access — Docklist" },
      {
        name: "description",
        content:
          "Enter your workspace code and personal or reset access code to open your staff portal.",
      },
    ],
  }),
  component: PortalAccessPage,
});

function PortalAccessPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [workspaceCode, setWorkspaceCode] = React.useState("");
  const [staffCode, setStaffCode] = React.useState("");
  const [mode, setMode] = React.useState<"initial" | "recovery">("initial");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const errorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!workspaceCode.trim() || !staffCode.trim()) {
      setError("Enter both your workspace code and your personal access code.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await claimPortalAccessFn({
        data: { workspaceCode, staffCode, mode },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      clearAuthStateCache();
      await router.invalidate();
      await navigate({ to: "/portal" });
    } catch {
      setError("Something went wrong on our end. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 focus:outline-none"
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/50 bg-background/95 p-6 shadow-2xl sm:p-8">
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-brand/10 bg-brand-soft text-brand">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Staff access</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the codes your manager gave you for first-time access or an access reset.
              </p>
            </div>

            {error && (
              <Alert
                ref={errorRef}
                id="portal-access-error"
                tabIndex={-1}
                variant="destructive"
                className="focus:outline-none"
              >
                <AlertTitle>We couldn't sign you in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset className="space-y-2" aria-describedby="portal-access-mode-help">
                <legend className="text-sm font-medium text-foreground">Access type</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["initial", "First-time access"],
                      ["recovery", "Access reset"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="cursor-pointer rounded-xl border border-border px-3 py-2 text-center text-xs font-medium has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
                    >
                      <input
                        type="radio"
                        name="portal-access-mode"
                        value={value}
                        checked={mode === value}
                        onChange={() => {
                          setMode(value);
                          setError("");
                        }}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p id="portal-access-mode-help" className="text-xs leading-5 text-muted-foreground">
                  {mode === "recovery"
                    ? "A reset code reconnects this staff record to this device and removes access from the previous device."
                    : "Use the personal code issued before you first opened the staff portal."}
                </p>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="portal-workspace-code">Workspace code</Label>
                <Input
                  id="portal-workspace-code"
                  type="text"
                  placeholder="e.g. HVK2-9RWT"
                  value={workspaceCode}
                  onChange={(e) => {
                    setWorkspaceCode(e.target.value);
                    setError("");
                  }}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error
                      ? "portal-access-mode-help portal-access-error"
                      : "portal-access-mode-help"
                  }
                  className="text-center font-mono text-lg tracking-widest uppercase"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portal-staff-code">
                  {mode === "recovery" ? "Your reset access code" : "Your personal access code"}
                </Label>
                <Input
                  id="portal-staff-code"
                  type="text"
                  placeholder="e.g. 7MPD-4QXZ"
                  value={staffCode}
                  onChange={(e) => {
                    setStaffCode(e.target.value);
                    setError("");
                  }}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error
                      ? "portal-access-mode-help portal-access-error"
                      : "portal-access-mode-help"
                  }
                  className="text-center font-mono text-lg tracking-widest uppercase"
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Checking your codes…</span>
                  </span>
                ) : (
                  "Open my portal"
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Lost access or changed device? Ask your manager to reset your staff access.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Manager or owner? Sign in here →
          </Link>
        </div>
      </div>
    </main>
  );
}
