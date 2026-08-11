import { toSafeBusinessMessage } from "@/lib/safe-errors";

export type TeamJson = null | boolean | number | string | TeamJson[] | { [key: string]: TeamJson };
export type TeamJsonObject = { [key: string]: TeamJson };

export type TeamMutationResult =
  | { ok: true; data: TeamJsonObject }
  | { ok: false; message: string };

export function teamRpcError(error: { code?: string | null; message?: string | null }): string {
  if (error.code === "42501") return "You don't have manager access for this action.";
  if (error.code === "P0002") return "That Team record no longer exists.";
  return toSafeBusinessMessage(error, "We couldn't update Team. Please try again.");
}
