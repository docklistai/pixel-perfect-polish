import { toSafeBusinessMessage } from "@/lib/safe-errors";

export type OpsJson = null | boolean | number | string | OpsJson[] | { [key: string]: OpsJson };
export type OpsJsonObject = { [key: string]: OpsJson };

export type OpsMutationResult = { ok: true; data: OpsJsonObject } | { ok: false; message: string };

export function opsRpcError(error: { code?: string | null; message?: string | null }): string {
  if (error.code === "42501") return "You don't have manager access for this action.";
  if (error.code === "P0002") return "That operational record no longer exists.";
  return toSafeBusinessMessage(error, "We couldn't update Ops. Please try again.");
}
