import { fetchAuthStateFn } from "./api/authState";
import type { AuthState } from "./types";

const CACHE_TTL_MS = 30_000;

let cached: { state: AuthState; at: number } | null = null;

/**
 * Browser-side cache so the root guard doesn't hit the server on every
 * client navigation. Never caches on the server: module state there is
 * shared across requests and would leak one user's state to another.
 */
export async function getAuthState(): Promise<AuthState> {
  if (typeof window === "undefined") {
    return fetchAuthStateFn();
  }
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.state;
  }
  const state = await fetchAuthStateFn();
  cached = { state, at: Date.now() };
  return state;
}

/** Call after sign-in, sign-out, or portal claim before router invalidation. */
export function clearAuthStateCache(): void {
  cached = null;
}
