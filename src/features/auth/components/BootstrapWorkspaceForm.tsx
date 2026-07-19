import * as React from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrapWorkspaceFn } from "../api/bootstrapWorkspace";
import { resetIdentityScopedClientState } from "../lib/identityBoundary";
import {
  BOOTSTRAP_WORKSPACE_DEFAULTS,
  buildBootstrapWorkspaceInput,
  type BootstrapWorkspaceField,
} from "../lib/bootstrapWorkspace";

interface BootstrapWorkspaceFormProps {
  onSignOut: () => void | Promise<void>;
  signingOut: boolean;
}

const BOOTSTRAP_FIELD_IDS = {
  workspaceName: "workspace-name",
  locationName: "starter-location",
  departmentName: "starter-department",
  timezone: "workspace-timezone",
} as const;

export function BootstrapWorkspaceForm({ onSignOut, signingOut }: BootstrapWorkspaceFormProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [locationName, setLocationName] = React.useState<string>(
    BOOTSTRAP_WORKSPACE_DEFAULTS.locationName,
  );
  const [departmentName, setDepartmentName] = React.useState<string>(
    BOOTSTRAP_WORKSPACE_DEFAULTS.departmentName,
  );
  const [timezone, setTimezone] = React.useState<string>(BOOTSTRAP_WORKSPACE_DEFAULTS.timezone);
  const [errors, setErrors] = React.useState<Partial<Record<BootstrapWorkspaceField, string>>>({});
  const [formError, setFormError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const formErrorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    const built = buildBootstrapWorkspaceInput({
      workspaceName,
      locationName,
      departmentName,
      timezone,
    });
    if (!built.ok) {
      setErrors(built.errors);
      const firstInvalidField = (
        ["workspaceName", "locationName", "departmentName", "timezone"] as const
      ).find((field) => built.errors[field]);
      requestAnimationFrame(() => {
        if (firstInvalidField) {
          document.getElementById(BOOTSTRAP_FIELD_IDS[firstInvalidField])?.focus();
        }
      });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const result = await bootstrapWorkspaceFn({ data: built.payload });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      await resetIdentityScopedClientState(queryClient);
      await router.invalidate();
      await navigate({ to: "/" });
    } catch {
      setFormError("We couldn't create your workspace. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearFieldError = (field: BootstrapWorkspaceField) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-border/60 bg-background/95 p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-brand/10 bg-brand-soft text-brand">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Create your workspace</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Set up the first workspace for your business. We'll add a starter location and a set
              of common departments (Front of house, Kitchen, Bar, Management) so rota setup can
              begin immediately.
            </p>
          </div>

          {formError && (
            <Alert
              ref={formErrorRef}
              id="bootstrap-workspace-form-error"
              tabIndex={-1}
              variant="destructive"
              className="mt-5 focus:outline-none"
            >
              <AlertTitle>Workspace not created</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
            aria-describedby={formError ? "bootstrap-workspace-form-error" : undefined}
          >
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace or business name</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => {
                  setWorkspaceName(event.target.value);
                  clearFieldError("workspaceName");
                }}
                required
                aria-invalid={Boolean(errors.workspaceName)}
                aria-describedby={
                  errors.workspaceName ? "bootstrap-workspace-name-error" : undefined
                }
                autoComplete="organization"
                placeholder="e.g. Harbour Bistro"
              />
              {errors.workspaceName && (
                <p id="bootstrap-workspace-name-error" className="text-xs text-destructive">
                  {errors.workspaceName}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starter-location">Starter location</Label>
                <Input
                  id="starter-location"
                  value={locationName}
                  onChange={(event) => {
                    setLocationName(event.target.value);
                    clearFieldError("locationName");
                  }}
                  aria-invalid={Boolean(errors.locationName)}
                  aria-describedby={
                    errors.locationName ? "bootstrap-location-name-error" : undefined
                  }
                />
                {errors.locationName && (
                  <p id="bootstrap-location-name-error" className="text-xs text-destructive">
                    {errors.locationName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="starter-department">Starter department</Label>
                <Input
                  id="starter-department"
                  value={departmentName}
                  onChange={(event) => {
                    setDepartmentName(event.target.value);
                    clearFieldError("departmentName");
                  }}
                  aria-invalid={Boolean(errors.departmentName)}
                  aria-describedby={
                    errors.departmentName ? "bootstrap-department-name-error" : undefined
                  }
                />
                {errors.departmentName && (
                  <p id="bootstrap-department-name-error" className="text-xs text-destructive">
                    {errors.departmentName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-timezone">Timezone</Label>
              <Input
                id="workspace-timezone"
                value={timezone}
                onChange={(event) => {
                  setTimezone(event.target.value);
                  clearFieldError("timezone");
                }}
                aria-invalid={Boolean(errors.timezone)}
                aria-describedby={errors.timezone ? "bootstrap-timezone-error" : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              {errors.timezone && (
                <p id="bootstrap-timezone-error" className="text-xs text-destructive">
                  {errors.timezone}
                </p>
              )}
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
                  <span>Creating workspace...</span>
                </span>
              ) : (
                "Create workspace"
              )}
            </Button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          <Button asChild variant="outline">
            <Link to="/portal/access">I have staff access codes</Link>
          </Button>
          <Button variant="ghost" onClick={onSignOut} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
          Joining an existing business? Ask an owner or manager to add you instead.
        </p>
      </div>
    </div>
  );
}
