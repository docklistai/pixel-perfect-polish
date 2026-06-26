export const BOOTSTRAP_WORKSPACE_DEFAULTS = {
  timezone: "Europe/London",
  locationName: "Main location",
  departmentName: "Front of house",
} as const;

export interface BootstrapWorkspaceFormValues {
  workspaceName?: string;
  slug?: string | null;
  timezone?: string | null;
  locationName?: string | null;
  departmentName?: string | null;
}

export interface BootstrapWorkspacePayload {
  workspaceName: string;
  slug: string | null;
  timezone: string;
  locationName: string;
  departmentName: string;
}

export type BootstrapWorkspaceField = keyof BootstrapWorkspacePayload;

export type BuildBootstrapWorkspaceInputResult =
  | { ok: true; payload: BootstrapWorkspacePayload }
  | { ok: false; errors: Partial<Record<BootstrapWorkspaceField, string>> };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIMEZONE_PATTERN = /^[A-Za-z_][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+){0,2}$/;

export function buildBootstrapWorkspaceInput(
  values: BootstrapWorkspaceFormValues,
): BuildBootstrapWorkspaceInputResult {
  const errors: Partial<Record<BootstrapWorkspaceField, string>> = {};
  const workspaceName = (values.workspaceName ?? "").trim();
  const slugInput = (values.slug ?? "").trim();
  const timezone = (values.timezone ?? "").trim() || BOOTSTRAP_WORKSPACE_DEFAULTS.timezone;
  const locationName =
    (values.locationName ?? "").trim() || BOOTSTRAP_WORKSPACE_DEFAULTS.locationName;
  const departmentName =
    (values.departmentName ?? "").trim() || BOOTSTRAP_WORKSPACE_DEFAULTS.departmentName;

  if (!workspaceName) {
    errors.workspaceName = "Enter your workspace or business name.";
  } else if (workspaceName.length > 120) {
    errors.workspaceName = "Workspace name must be 120 characters or fewer.";
  }

  if (slugInput) {
    if (slugInput !== slugInput.toLowerCase() || !SLUG_PATTERN.test(slugInput)) {
      errors.slug = "Use lower-case letters, numbers, and hyphens only.";
    } else if (slugInput.length > 80) {
      errors.slug = "Workspace slug must be 80 characters or fewer.";
    }
  }

  if (timezone.length > 80 || !TIMEZONE_PATTERN.test(timezone)) {
    errors.timezone = "Enter a valid timezone, such as Europe/London.";
  }

  if (locationName.length > 120) {
    errors.locationName = "Location name must be 120 characters or fewer.";
  }
  if (departmentName.length > 120) {
    errors.departmentName = "Department name must be 120 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      workspaceName,
      slug: slugInput || null,
      timezone,
      locationName,
      departmentName,
    },
  };
}

export function describeBootstrapWorkspaceError(
  sqlState: string | null,
  _message?: string,
): string {
  switch (sqlState) {
    case "42501":
      return "Sign in again to create your workspace.";
    case "22023":
      return "Check the workspace details and try again.";
    case "23505":
      return "That workspace URL is already in use. Try a different workspace name.";
    case "55000":
      return "Your account is already linked to a workspace. Sign out and back in if this looks wrong.";
    default:
      return "We couldn't create your workspace. Please try again.";
  }
}
