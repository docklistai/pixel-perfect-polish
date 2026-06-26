import { createServerFn } from "@tanstack/react-start";
import {
  buildBootstrapWorkspaceInput,
  describeBootstrapWorkspaceError,
  type BootstrapWorkspacePayload,
} from "../lib/bootstrapWorkspace";

const ACTIVE_WORKSPACE_COOKIE = "docklist.workspace_id";

interface BootstrapWorkspaceRpcResult {
  workspace_id: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  membership: {
    id: string;
    role: "owner";
    status: "active";
  };
  location: {
    id: string;
    name: string;
    timezone: string;
  };
  department: {
    id: string;
    name: string;
  };
}

export type BootstrapWorkspaceResult =
  | {
      ok: true;
      workspaceId: string;
      workspace: BootstrapWorkspaceRpcResult["workspace"];
      location: BootstrapWorkspaceRpcResult["location"];
      department: BootstrapWorkspaceRpcResult["department"];
    }
  | { ok: false; message: string };

function validateBootstrapInput(input: unknown): BootstrapWorkspacePayload {
  const result = buildBootstrapWorkspaceInput(input as BootstrapWorkspacePayload);
  if (!result.ok) {
    throw new Error("Check the workspace details and try again.");
  }
  return result.payload;
}

function isBootstrapRpcResult(value: unknown): value is BootstrapWorkspaceRpcResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<BootstrapWorkspaceRpcResult>;
  return (
    typeof result.workspace_id === "string" &&
    typeof result.workspace?.id === "string" &&
    typeof result.workspace.name === "string" &&
    typeof result.workspace.slug === "string" &&
    typeof result.workspace.timezone === "string" &&
    typeof result.location?.id === "string" &&
    typeof result.location.name === "string" &&
    typeof result.location.timezone === "string" &&
    typeof result.department?.id === "string" &&
    typeof result.department.name === "string"
  );
}

export const bootstrapWorkspaceFn = createServerFn({ method: "POST" })
  .inputValidator(validateBootstrapInput)
  .handler(async ({ data }): Promise<BootstrapWorkspaceResult> => {
    const { setCookie } = await import("@tanstack/react-start/server");
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { data: rpcData, error } = await supabase.rpc("rpc_bootstrap_workspace", {
      p_workspace_name: data.workspaceName,
      p_slug: data.slug,
      p_timezone: data.timezone,
      p_location_name: data.locationName,
      p_department_name: data.departmentName,
    });

    if (error) {
      return { ok: false, message: describeBootstrapWorkspaceError(error.code ?? null) };
    }
    if (!isBootstrapRpcResult(rpcData)) {
      return { ok: false, message: describeBootstrapWorkspaceError(null) };
    }

    setCookie(ACTIVE_WORKSPACE_COOKIE, rpcData.workspace_id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 365,
    });

    return {
      ok: true,
      workspaceId: rpcData.workspace_id,
      workspace: rpcData.workspace,
      location: rpcData.location,
      department: rpcData.department,
    };
  });
