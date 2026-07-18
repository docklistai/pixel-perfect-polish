const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/landing": "DocklistAI home",
  "/auth/reset": "Reset password",
  "/auth": "Manager and staff sign in",
  "/portal/access": "Staff portal access",
  "/portal": "Staff portal",
  "/no-access": "Workspace access",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
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

export function getRouteLabel(pathname: string): string {
  const matchedKey = Object.keys(ROUTE_LABELS)
    .filter((key) => pathname === key || pathname.startsWith(key + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return matchedKey ? ROUTE_LABELS[matchedKey]! : "Page";
}
