/**
 * Accessibility helpers tied to TanStack Router.
 *
 * - SkipToContent: visible-on-focus skip link.
 * - RouteAnnouncer: polite live region announcing the current page title.
 * - RouteFocusManager: moves focus to #main-content on route change.
 */
import * as React from "react";
import { useRouterState } from "@tanstack/react-router";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/rota": "Rota",
  "/staff": "Staff",
  "/time": "Time and attendance",
  "/leave": "Leave",
  "/team": "Team",
  "/ops": "Operations",
  "/reports": "Reports",
  "/settings": "Settings",
  "/ui-kit": "UI kit",
};

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand focus:text-brand-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}

export function RouteAnnouncer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const label = ROUTE_LABELS[pathname] ?? "Page";
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {`${label} page loaded`}
    </div>
  );
}

/**
 * Moves focus to the #main-content landmark on every route change so that
 * keyboard and screen-reader users land at the start of the new page.
 * The first render is skipped to preserve the user's natural focus.
 */
export function RouteFocusManager() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (typeof document === "undefined") return;
    const el = document.getElementById("main-content");
    if (el) {
      el.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}
