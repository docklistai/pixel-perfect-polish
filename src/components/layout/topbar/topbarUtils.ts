import * as React from "react";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "docklist.theme";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function weekLabelForAnchor(anchor: Date): string {
  const weekday = anchor.getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;

  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const endYear = sunday.getFullYear();
  const shortMonth = (date: Date) => date.toLocaleString("en-GB", { month: "short" });

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay}–${endDay} ${shortMonth(sunday)} ${endYear}`;
  }
  return `${startDay} ${shortMonth(monday)}–${endDay} ${shortMonth(sunday)} ${endYear}`;
}

/** Demo-playground week label, pinned to the seeded Harbour View week. */
export function getWeekLabelForOffset(offset: number = 0): string {
  return weekLabelForAnchor(new Date(2026, 5, 11 + offset * 7));
}

/** Real current-week label (Mon–Sun containing today), for live workspaces. */
export function getLiveWeekLabelForOffset(offset: number = 0): string {
  const today = new Date();
  return weekLabelForAnchor(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset * 7),
  );
}

export function getWeekSubtitle(offset: number) {
  if (offset === 0) return "Current week";
  if (offset === 1) return "Next week";
  if (offset === -1) return "Previous week";
  return offset > 0 ? `+${offset} weeks` : `${offset} weeks`;
}

export function useDocklistTheme() {
  const [theme, setTheme] = React.useState<ThemeMode>("dark");

  useIsomorphicLayoutEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) || "dark";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
