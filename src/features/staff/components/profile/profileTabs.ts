/**
 * Which sections a staff profile has, and which of them are real.
 *
 * Kept out of the component file so it can be read without React: this is the
 * product decision about what a live workspace member actually has, and both
 * the profile screen and its tests import it directly.
 */

export type ProfileTab =
  | "overview"
  | "schedule"
  | "time"
  | "leave"
  | "documents"
  | "notes"
  | "insights";

export type ProfileTabDefinition = { id: ProfileTab; label: string };

/** Every section a profile can have. The demo workspace shows all of them. */
export const ALL_PROFILE_TABS: readonly ProfileTabDefinition[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "time", label: "Time" },
  { id: "leave", label: "Leave & Absence" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
  { id: "insights", label: "Work patterns" },
];

/**
 * The sections a LIVE workspace member actually has.
 *
 * Documents, Notes and Work patterns have no live source during the supervised
 * pilot. They used to render honest "not connected" panels, which was truthful
 * but still offered a manager three tabs that could never hold anything. A tab
 * that can only ever disappoint is worse than an absent one, so live profiles
 * show what works and nothing else. The implementations stay for demo.
 */
export const LIVE_PROFILE_TABS: readonly ProfileTabDefinition[] = ALL_PROFILE_TABS.filter(
  (tab) =>
    tab.id === "overview" || tab.id === "schedule" || tab.id === "time" || tab.id === "leave",
);

/** The first available tab, used when a deep link names one that is not shown. */
export function resolveProfileTab(
  requested: ProfileTab | undefined,
  tabs: readonly ProfileTabDefinition[],
): ProfileTab {
  if (requested && tabs.some((tab) => tab.id === requested)) return requested;
  return tabs[0]?.id ?? "overview";
}
