import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("preview surfaces stay reachable and labelled", () => {
  it("no longer redirects preview routes away from manager testers", () => {
    const guards = source("src/features/auth/guards.ts");
    expect(guards).toContain("export function requirePreviewSurface");
    // Manager protection stays; the pilot bounce is gone.
    expect(guards).not.toContain("isPilotSurface");
    const previewGuard = guards.slice(guards.indexOf("export function requirePreviewSurface"));
    const body = previewGuard.slice(0, previewGuard.indexOf("}"));
    expect(body).toContain("requireManagerAccess");
    expect(body).not.toContain("redirect");
  });

  it("groups navigation as Live and Preview without hiding preview routes", () => {
    const sidebar = source("src/components/layout/Sidebar.tsx");
    expect(sidebar).toContain('{ key: "live", label: "Live"');
    expect(sidebar).toContain('{ key: "preview", label: "Preview"');
    expect(sidebar).not.toContain("isPilotSurface");
    // The Preview pill survives.
    expect(sidebar).toContain("Preview");
  });

  it("keeps every preview route in the command palette", () => {
    const palette = source("src/components/CommandPalette.tsx");
    expect(palette).toContain("COMMAND_NAV_ITEMS.map");
    expect(palette).not.toContain("visibleCommandNavItems");
    expect(palette).toContain("Preview");
  });

  it("keeps the existing preview banners in place", () => {
    expect(source("src/routes/reports.tsx")).toContain(
      "Preview — Reports uses sample reporting content",
    );
    expect(source("src/routes/team.tsx")).toContain(
      "Preview — Team uses sample communication content",
    );
  });
});

describe("scheduling copy states only what is modelled", () => {
  const rotaCopy = [
    "src/features/rota/components/RotaGridToolbar.tsx",
    "src/features/rota/components/WorkingTimeDetailsDrawer.tsx",
    // The former GenerateRotaDialog and BuildThisWeekDialog were replaced by the
    // reviewed Build flow; the same honesty rules apply to its copy.
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
    // Every mention of optimisation must be a denial, never a claim.
    for (const match of rotaCopy.matchAll(/[^.]*optimis[^.]*\./gi)) {
      expect(match[0]).toMatch(/\bnot\b/i);
    }
    expect(rotaCopy).toMatch(/draft staffing suggestions/i);
    expect(rotaCopy).not.toMatch(/auto-generate|generates? (?:the |your )?rota/i);
  });

  it("renames the dashboard rota action away from 'Generate rota draft'", () => {
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
