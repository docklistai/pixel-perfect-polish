import { useRouterState } from "@tanstack/react-router";
import { isPilotSurface } from "@/config/pilot";
import { TopbarWorkspacePill } from "./topbar/TopbarWorkspacePill";
import { TopbarWeekPill } from "./topbar/TopbarWeekPill";
import { TopbarSearch } from "./topbar/TopbarSearch";
import { TopbarActions } from "./topbar/TopbarActions";
import { useDocklistTheme } from "./topbar/topbarUtils";

export function Topbar({
  searchPlaceholder = "Search staff, shifts, leave...",
  displayedWeekLabel,
}: {
  searchPlaceholder?: string;
  displayedWeekLabel?: string;
}) {
  const { theme, toggleTheme } = useDocklistTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });
  // In the live pilot, week selection belongs to the Rota page — the only
  // surface that actually consumes it. Other pages (Home, Time, Staff, Leave)
  // read fixed periods, so a global pill would imply a link that isn't there.
  // The offline demo playground keeps the shared pill everywhere.
  const showWeekPill = !isPilotSurface() || path.startsWith("/rota");

  return (
    <header className="topbar" aria-label="Workspace toolbar">
      <TopbarWorkspacePill />
      {showWeekPill && <TopbarWeekPill displayedWeekLabel={displayedWeekLabel} />}
      <div className="spacer" />
      <TopbarSearch searchPlaceholder={searchPlaceholder} />
      <TopbarActions theme={theme} toggleTheme={toggleTheme} />
    </header>
  );
}
