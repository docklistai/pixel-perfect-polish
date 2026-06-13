import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

let client: SupabaseClient | null = null;

/**
 * Singleton browser client. Sessions are stored in cookies (via
 * `@supabase/ssr`) so server functions and SSR loaders see the same session.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const env = getSupabaseEnv();
    if (!env) {
      throw new Error(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      );
    }
    client = createBrowserClient(env.url, env.anonKey);
  }
  return client;
}
