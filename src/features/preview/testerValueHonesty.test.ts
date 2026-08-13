import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("preview surfaces stay reachable and labelled", () => {
  it("keeps the preview guard manager-protected", () => {
    const guards = source("src/features/auth/guards.ts");
    expect(guards).toContain("export function requirePreviewSurface");
    expect(guards).not.toContain("isPilotSurface");
    const previewGuard = guards.slice(guards.indexOf("export function requirePreviewSurface"));
    const body = previewGuard.slice(0, previewGuard.indexOf("}"));
    expect(body).toContain("requireManagerAccess");
    expect(body).not.toContain("redirect");
  });

  it("keeps navigation grouping without hiding routes", () => {
    const sidebar = source("src/components/layout/Sidebar.tsx");
    expect(sidebar).toContain('{ key: "live", label: "Live"');
    expect(sidebar).toContain('{ key: "preview", label: "Preview"');
    expect(sidebar).not.toContain("isPilotSurface");
    expect(sidebar).toContain('{ to: "/ops", label: "Ops", icon: Briefcase, group: "live"');
  });

  it("keeps command navigation complete", () => {
    const palette = source("src/components/CommandPalette.tsx");
    expect(palette).toContain("COMMAND_NAV_ITEMS.map");
    expect(palette).not.toContain("visibleCommandNavItems");
  });

  it("keeps Team live throughout route and navigation", () => {
    expect(source("src/routes/team.tsx")).toContain("requireManagerAccess");
    expect(source("src/routes/team.tsx")).not.toContain("requirePreviewSurface");
    expect(source("src/components/layout/Sidebar.tsx")).toContain(
      '{ to: "/team", label: "Team", icon: MessageSquare, group: "live"',
    );
    expect(source("src/components/commandPaletteData.ts")).toContain(
      '{ label: "Team", to: "/team", icon: MessageSquare }',
    );
  });

  it("promotes Reports through route, navigation, and command palette together", () => {
    expect(source("src/routes/reports.tsx")).toContain("requireManagerAccess");
    expect(source("src/routes/reports.tsx")).not.toContain("requirePreviewSurface");
    expect(source("src/routes/reports.tsx")).not.toMatch(/Preview.*Reports/);
    expect(source("src/components/layout/Sidebar.tsx")).toContain(
      '{ to: "/reports", label: "Reports", icon: BarChart3, group: "live", mobileOverflow: true }',
    );
    expect(source("src/components/commandPaletteData.ts")).toContain(
      '{ label: "Reports", to: "/reports", icon: BarChart3 }',
    );
  });
});

describe("scheduling copy states only what is modelled", () => {
  const rotaCopy = [
    "src/features/rota/components/RotaGridToolbar.tsx",
    "src/features/rota/components/WorkingTimeDetailsDrawer.tsx",
    "src/features/rota/components/buildWeek/BuildWeekDrawer.tsx",
    "src/features/rota/components/buildWeek/BuildWeekSourceStep.tsx",
    "src/features/rota/components/buildWeek/BuildWeekReviewStep.tsx",
    "src/features/rota/components/buildWeek/BuildWeekStepActions.tsx",
  ]
    .map(source)
    .join("\n");

  it("drops claims of rest-break and weekly working-time enforcement", () => {
    expect(rotaCopy).not.toMatch(/rest breaks and weekly limits/i);
    expect(rotaCopy).toMatch(/not a full working-time or rest-break check/i);
  });

  it("never claims an optimal or auto-generated rota", () => {
    for (const match of rotaCopy.matchAll(/[^.]*optimis[^.]*\./gi)) {
      expect(match[0]).toMatch(/\bnot\b/i);
    }
    expect(rotaCopy).toMatch(/draft staffing suggestions/i);
    expect(rotaCopy).not.toMatch(/auto-generate|generates? (?:the |your )?rota/i);
  });

  it("uses Build this week copy", () => {
    const dashboard = source("src/routes/index.tsx");
    const palette = source("src/components/commandPaletteData.ts");
    expect(dashboard).not.toContain("Generate rota draft");
    expect(palette).not.toContain("Generate rota draft");
    expect(dashboard).toContain("Build this week");
    expect(palette).toContain("Build this week");
  });
});

describe("staff portal carries no fake persistence", () => {
  it("removes the component-state shift acknowledgement action", () => {
    const shiftsTab = source("src/features/staff-portal/components/ShiftsTab.tsx");
    const drawer = source("src/features/staff-portal/components/ShiftDetailDrawer.tsx");
    expect(shiftsTab).not.toMatch(/acknowledg/i);
    expect(drawer).not.toContain("Acknowledge shift change");
    expect(drawer).not.toContain("Changes acknowledged");
  });

  it("explains honestly that confirming a change is not in this pilot", () => {
    const drawer = source("src/features/staff-portal/components/ShiftDetailDrawer.tsx").replace(
      /\s+/g,
      " ",
    );
    expect(drawer).toContain(
      "Confirming shift changes in the app isn&apos;t available in this pilot",
    );
  });
});
