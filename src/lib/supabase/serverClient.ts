import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import { getSupabaseEnv } from "./env";

/**
 * Per-request server client bound to the incoming request's cookies. Only for
 * use inside `createServerFn` handlers — never module scope, so one user's
 * session can never bleed into another request.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookies: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const cookie of cookies) {
          setCookie(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
}
