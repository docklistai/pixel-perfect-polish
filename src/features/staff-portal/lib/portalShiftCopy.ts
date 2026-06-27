/**
 * Empty-state copy for the staff portal's "upcoming shifts" surfaces (Home next
 * shift + Shifts → Upcoming). The distinction matters for trust: when a rota
 * has been published but the member simply has no *future* shifts, we must say
 * "no upcoming shifts" — never imply the manager hasn't published a rota.
 *
 * Pure and unit-testable; no React/Supabase.
 */
export interface PortalEmptyCopy {
  title: string;
  description: string;
}

/**
 * @param hasPublishedRota whether any current/future published rota exists for
 * the member's workspace (not whether this member has shifts in it).
 */
export function noUpcomingShiftsCopy(hasPublishedRota: boolean): PortalEmptyCopy {
  if (hasPublishedRota) {
    return {
      title: "No upcoming shifts",
      description: "You do not have any upcoming shifts on the published rota.",
    };
  }
  return {
    title: "No published rota yet",
    description: "Once your manager publishes the rota, your next shift will appear here.",
  };
}
