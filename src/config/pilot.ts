import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Pilot surface mode.
 *
 * A build with Supabase configured serves the live pilot: navigation and
 * settings show only shipped, truthful surfaces. Preview-only products
 * (Team, Ops, Reports) and non-persisted settings controls are hidden.
 *
 * The offline demo playground (no Supabase env) is the only place preview
 * surfaces remain visible, always labelled as previews.
 */
export function isPilotSurface(): boolean {
  return Boolean(getSupabaseEnv());
}
