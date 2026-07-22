import { redirect } from "@tanstack/react-router";
import type { AuthState } from "./types";

/**
 * Preview surfaces (Team, Ops, Reports) show sample content only — no live
 * workspace reads, no writes, no backend. They carry page-level preview banners
 * and sample labels (locked by `src/features/preview/previewHonesty.test.ts`),
 * so a manager tester may open them directly under the same manager access
 * protection as any other route. They are labelled PREVIEW in navigation and are
 * never presented as active pilot features.
 */
export function requirePreviewSurface(auth: AuthState): void {
  requireManagerAccess(auth);
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
