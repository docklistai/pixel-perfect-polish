import { redirect } from "@tanstack/react-router";
import { isPilotSurface } from "@/config/pilot";
import type { AuthState } from "./types";

/**
 * Preview-only surfaces (Team, Ops, Reports) exist solely in the offline demo
 * playground. The live pilot has no navigation to them and direct visits are
 * sent home so demo content can never appear inside a live workspace.
 */
export function requirePreviewSurface(auth: AuthState): void {
  requireManagerAccess(auth);
  if (isPilotSurface()) throw redirect({ to: "/" });
}

/** Owner/manager-only routes: dashboard, rota, time, staff, leave, etc. */
export function requireManagerAccess(auth: AuthState): void {
  if (auth.status === "signed-out") throw redirect({ to: "/auth" });
  // no-workspace, no-staff-profile, and workspace-selection-required all lack a
  // resolved single membership/role — none may enter a manager route.
  if (auth.status !== "member") throw redirect({ to: "/no-access" });
  if (auth.role === "staff") throw redirect({ to: "/portal" });
}

/** Staff portal: staff only; managers go back to their dashboard. */
export function requireStaffPortalAccess(auth: AuthState): void {
  if (auth.status === "signed-out") throw redirect({ to: "/portal/access" });
  if (auth.status !== "member") throw redirect({ to: "/no-access" });
  if (auth.role !== "staff") throw redirect({ to: "/" });
}

/** Entry pages (/auth, /portal/access): members are sent to their home. */
export function redirectActiveMembers(auth: AuthState): void {
  if (auth.status === "member") {
    throw redirect({ to: auth.role === "staff" ? "/portal" : "/" });
  }
}

/** /no-access is only for authenticated users with incomplete workspace access. */
export function requireNoWorkspaceState(auth: AuthState): void {
  if (auth.status === "signed-out") throw redirect({ to: "/auth" });
  if (auth.status === "member") {
    throw redirect({ to: auth.role === "staff" ? "/portal" : "/" });
  }
}
