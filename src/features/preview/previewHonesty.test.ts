import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const reportsSource = [
  "src/routes/reports.tsx",
  "src/features/reports/components/InsightDetailDrawer.tsx",
  "src/features/reports/components/ReportsContractReviewCard.tsx",
  "src/features/reports/components/ReportsQuickReportsCard.tsx",
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
  "src/features/team/components/TeamAnnouncementComments.tsx",
  "src/features/team/components/TeamAnnouncementReadStatus.tsx",
  "src/features/team/components/TeamAnnouncementRosterDialog.tsx",
  "src/features/team/components/TeamComposeDrawer.tsx",
  "src/features/team/components/TeamTrainingDetailDrawer.tsx",
  "src/features/team/components/TeamBirthdayDialog.tsx",
  "src/features/team/components/TeamRightRail.tsx",
  "src/features/team/components/TeamAnnouncementList.tsx",
  "src/features/team/components/TeamKpiCards.tsx",
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
  it("keeps the remaining Settings preview banner", () => {
    expect(source("src/routes/settings.tsx")).toContain(
      "Preview — most settings are not live-wired yet",
    );
  });

  it("carries no demo, financial, scoring, or report-builder claims on live Reports", () => {
    expect(reportsSource).not.toMatch(/\bSample\b|Preview only|Preview — Reports/i);
    expect(reportsSource).not.toMatch(/labour cost|labour vs sales|attendance rate/i);
    expect(reportsSource).not.toMatch(
      /Top performers|["'](?:Strong|Stable|Watch)["']|employee score/i,
    );
    expect(reportsSource).not.toMatch(
      /New report|saved reports|save to library|PDF|Excel|AI export/i,
    );
    expect(source("src/routes/reports.tsx")).toContain("useReportsPage");
    expect(source("src/features/reports/hooks/useReportsPage.ts")).not.toMatch(/Demo|fixture/i);
  });

  it("keeps Reports inside fixed operational scheduling and light-HR scope", () => {
    expect(reportsSource).toContain("Published scheduling trend");
    expect(reportsSource).toContain("Scheduled staffing density");
    expect(reportsSource).toContain("Quick reports");
    expect(reportsSource).not.toMatch(/forecast|optimis|payroll|recruitment|birthday/i);
  });

  it("carries no preview or sample content on live Team", () => {
    expect(teamSource).not.toMatch(/Preview — Team|\bSample\b|Preview only/);
    expect(teamSource).not.toMatch(/nothing is saved|not saved or sent|no file was prepared/i);
  });

  it("drives Team from the live read model, never from a fixture", () => {
    expect(() => source("src/features/team/data/teamDemoData.ts")).toThrow();
    expect(teamSource).not.toMatch(/teamDemoData|CANONICAL_STAFF|TOTAL_STAFF/);
    expect(source("src/features/team/hooks/useTeamPage.ts")).toContain("EMPTY_TEAM_PAGE");
  });

  it("keeps Team's staff-broadcast scope", () => {
    expect(teamSource).not.toMatch(/direct message|\bDM\b|channel|reaction|emoji picker/i);
    expect(teamSource).not.toMatch(/course|module|lesson|certificate|assessment|quiz/i);
    expect(teamSource).not.toMatch(/RSVP|attendance|book a place/i);
  });

  it("keeps Settings preview claims honest", () => {
    expect(settingsSource).toContain("Preview only — no workspace settings are persisted");
    expect(settingsSource).toContain("Preview security control");
    expect(settingsSource).not.toMatch(/Settings saved|Role duplicated|Role updated/i);
    expect(settingsSource).not.toMatch(/Your download will start shortly|Renews 8 Jul 2026/i);
  });
});
