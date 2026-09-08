import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Pilot surface mode.
 *
 * A build with Supabase configured serves the live pilot: navigation and
 * settings show only shipped, truthful surfaces. Team, Ops and Reports are all
 * live; what the pilot hides is the settings tabs whose controls do not persist
 * (see `visibleSettingsTabs`) and the sample-content quick actions.
 *
 * The offline demo playground (no Supabase env) is the only place preview
 * surfaces remain visible, always labelled as previews.
 */
export function isPilotSurface(): boolean {
  return Boolean(getSupabaseEnv());
}
