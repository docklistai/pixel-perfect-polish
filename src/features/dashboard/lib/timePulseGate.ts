/**
 * The single predicate deciding whether Time Pulse may read anything.
 *
 * Kept pure and separate from the hook so "off means off" is a tested rule
 * rather than a claim about a `useQuery` option. Every condition must hold:
 * a live Supabase surface, a resolved workspace, an owner/manager caller, and
 * the persisted Labs flag actually on. Anything unknown resolves to false, so
 * a loading or failed flag read cannot switch the experiment on.
 */
export function shouldReadTimePulse(input: {
  hasSupabase: boolean;
  workspaceId: string | null;
  role: string | null;
  labsTimePulseEnabled: boolean;
}): boolean {
  const isManager = input.role === "owner" || input.role === "manager";
  return (
    input.hasSupabase &&
    input.workspaceId !== null &&
    isManager &&
    input.labsTimePulseEnabled === true
  );
}
