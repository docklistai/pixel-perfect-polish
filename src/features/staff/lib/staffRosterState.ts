export type StaffRosterLoadState = "loading" | "error" | "ready";

interface StaffRosterStateInput<T> {
  liveEnabled: boolean;
  isLoading: boolean;
  isError: boolean;
  liveRows: T[] | undefined;
  demoRows: T[];
}

interface StaffRosterState<T> {
  source: "live" | "demo";
  rows: T[];
  state: StaffRosterLoadState;
}

export function resolveStaffRosterState<T>({
  liveEnabled,
  isLoading,
  isError,
  liveRows,
  demoRows,
}: StaffRosterStateInput<T>): StaffRosterState<T> {
  if (!liveEnabled) return { source: "demo", rows: demoRows, state: "ready" };
  if (isLoading) return { source: "live", rows: [], state: "loading" };
  if (isError) return { source: "live", rows: [], state: "error" };
  return { source: "live", rows: liveRows ?? [], state: "ready" };
}
