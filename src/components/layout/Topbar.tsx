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

  return (
    <header className="topbar" aria-label="Workspace toolbar">
      <TopbarWorkspacePill />
      <TopbarWeekPill displayedWeekLabel={displayedWeekLabel} />
      <div className="spacer" />
      <TopbarSearch searchPlaceholder={searchPlaceholder} />
      <TopbarActions theme={theme} toggleTheme={toggleTheme} />
    </header>
  );
}
