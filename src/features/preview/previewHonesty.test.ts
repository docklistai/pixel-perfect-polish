import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const reportsSource = [
  "src/routes/reports.tsx",
  "src/features/reports/components/ReportsExportDialog.tsx",
  "src/features/reports/components/InsightDetailDrawer.tsx",
  "src/features/reports/components/ReportsTopPerformersCard.tsx",
  "src/features/reports/components/ReportsSavedReportsCard.tsx",
  "src/features/reports/components/DepartmentLabourPanel.tsx",
  "src/features/reports/components/LabourTargetChart.tsx",
  "src/features/reports/components/ReportsCoverageHeatmapCard.tsx",
  "src/features/reports/components/ReportsInsightsPanel.tsx",
]
  .map(source)
  .join("\n");

const teamSource = [
  "src/routes/team.tsx",
  "src/features/team/components/TeamAnnouncementDetailDrawer.tsx",
  "src/features/team/components/TeamComposeDrawer.tsx",
  "src/features/team/components/TeamTrainingDetailDrawer.tsx",
  "src/features/team/components/TeamRightRail.tsx",
  "src/features/team/components/TeamAnnouncementList.tsx",
  "src/features/team/data/teamDemoData.ts",
]
  .map(source)
  .join("\n");

const settingsSource = [
  "src/routes/settings.tsx",
  "src/features/settings/components/AccessTab.tsx",
  "src/features/settings/components/ExportsTab.tsx",
  "src/features/settings/components/PlanLimitsTab.tsx",
  "src/features/settings/components/SettingsPrimitives.tsx",
  "src/features/settings/data/settingsTabs.ts",
]
  .map(source)
  .join("\n");

describe("preview containment honesty", () => {
  it("renders page-level preview banners for Reports, Team, and Settings", () => {
    expect(source("src/routes/reports.tsx")).toContain(
      "Preview — Reports uses sample reporting content",
    );
    expect(source("src/routes/team.tsx")).toContain(
      "Preview — Team uses sample communication content",
    );
    expect(source("src/routes/settings.tsx")).toContain(
      "Preview — most settings are not live-wired yet",
    );
  });

  it("keeps Reports sample and removes fake export/save/performance claims", () => {
    expect(reportsSource).toContain("Sample chart");
    expect(reportsSource).toContain("Sample finance figure");
    expect(reportsSource).toContain("Sample saved report");
    expect(reportsSource).toContain("Sample heatmap");
    expect(reportsSource).toContain("Sample coaching signals");
    expect(reportsSource).not.toMatch(
      /Preview ready|Export ready|is downloading|Saved to your library/i,
    );
    expect(reportsSource).not.toMatch(
      /last refreshed 8 min ago|Last run|Top performers|Performance review/i,
    );
  });

  it("keeps Team communication as sample preview, not chat, monitoring, or LMS persistence", () => {
    expect(teamSource).toContain("Sample read indicators");
    expect(teamSource).toContain("Sample manager notes");
    expect(teamSource).toContain("Sample training reminders");
    expect(teamSource).not.toMatch(/Comment saved|Your acknowledgement is recorded|Exported/i);
    expect(teamSource).not.toMatch(/Reply to all|See who|track who's read what|staff app feed/i);
    expect(teamSource).not.toMatch(/Marked completed|Note added to training record|detail opened/i);
  });

  it("keeps Settings changes as preview and removes fake RBAC, security, billing, and export claims", () => {
    expect(settingsSource).toContain("Preview only — no workspace settings are persisted");
    expect(settingsSource).toContain("Preview security control");
    expect(settingsSource).toContain("Sample plan");
    expect(settingsSource).not.toMatch(/Settings saved|Role duplicated|Role updated/i);
    expect(settingsSource).not.toMatch(/Your download will start shortly|Renews 8 Jul 2026/i);
    expect(settingsSource).not.toMatch(/Permission changes apply to everyone in this role/i);
  });
});
