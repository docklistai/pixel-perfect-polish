import type { QueryClient } from "@tanstack/react-query";
import { clearAuthStateCache } from "../authStateCache";

/**
 * Identity boundary reset. Must run whenever the authenticated principal or
 * active workspace can change in this tab: sign-out, sign-in (account switch),
 * portal claim, staff access recovery, and workspace selection.
 *
 * Order matters: in-flight reads are cancelled first so a response started
 * under the previous identity can never land in the next identity's cache;
 * then every cached query is dropped (all tenant-sensitive data — rota, time,
 * staff, leave, identity, settings — lives in this cache); finally the
 * auth-state cache is cleared so the router guards re-resolve the principal.
 */
export async function resetIdentityScopedClientState(queryClient: QueryClient): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
  clearAuthStateCache();
}
