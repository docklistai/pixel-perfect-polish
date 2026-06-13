interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Reads the public Supabase settings. Returns null when the environment is
 * not configured so callers can fall back to a safe signed-out state instead
 * of crashing the app shell.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
