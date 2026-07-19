export { AuthValuePanel } from "./components/AuthValuePanel";
export { AuthForm } from "./components/AuthForm";
export { AuthModeToggle } from "./components/AuthModeToggle";
export { AuthNextStepNotice } from "./components/AuthNextStepNotice";
export { getAuthState, clearAuthStateCache } from "./authStateCache";
export { resetIdentityScopedClientState } from "./lib/identityBoundary";
export { useAuthStateRevalidation } from "./hooks/useAuthStateRevalidation";
export {
  requireManagerAccess,
  requireStaffPortalAccess,
  redirectActiveMembers,
  requireNoWorkspaceState,
  requirePreviewSurface,
} from "./guards";
export type { AuthState, WorkspaceRole, ClaimPortalAccessResult } from "./types";
