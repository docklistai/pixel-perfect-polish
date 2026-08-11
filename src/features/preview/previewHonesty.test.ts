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

// Team went live in Phase 55. These are the same files, minus the deleted
// fixture — they are now asserted to contain NO preview content at all.
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
  it("renders page-level preview banners for the surfaces that are still preview", () => {
    expect(source("src/routes/reports.tsx")).toContain(
      "Preview — Reports uses sample reporting content",
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

  it("carries no preview or sample content on the now-live Team surface", () => {
    // The banner, every "Sample …" label and every "Preview only" toast are
    // gone because the underlying behaviour is real, not because the wording
    // was quietly softened.
    expect(teamSource).not.toMatch(/Preview — Team/);
    expect(teamSource).not.toMatch(/\bSample\b/);
    expect(teamSource).not.toMatch(/Preview only|Preview ack|Preview reminder|Preview publish/);
    expect(teamSource).not.toMatch(/nothing is saved|not saved or sent|no file was prepared/i);
  });

  it("drives Team from the live read model, never from a fixture", () => {
    expect(() => source("src/features/team/data/teamDemoData.ts")).toThrow();
    expect(teamSource).not.toMatch(/teamDemoData|CANONICAL_STAFF|TOTAL_STAFF/);
    expect(source("src/routes/team.tsx")).toContain("useTeamPage");
    expect(source("src/features/team/hooks/useTeamPage.ts")).toContain("fetchTeamPageFn");
    // An unresolved or failed live read must not borrow sample content.
    expect(source("src/features/team/hooks/useTeamPage.ts")).toContain("EMPTY_TEAM_PAGE");
  });

  it("keeps Team's staff-broadcast scope — no chat, LMS or engagement drift", () => {
    expect(teamSource).not.toMatch(/direct message|\bDM\b|channel|reaction|emoji picker/i);
    expect(teamSource).not.toMatch(/course|module|lesson|certificate|assessment|quiz/i);
    expect(teamSource).not.toMatch(/RSVP|attendance|book a place/i);
  });

  it("keeps Settings changes as preview and removes fake RBAC, security, billing, and export claims", () => {
    expect(settingsSource).toContain("Preview only — no workspace settings are persisted");
    expect(settingsSource).toContain("Preview security control");
    expect(settingsSource).toContain("Sample usage");
    expect(settingsSource).toContain("Indicative only");
    expect(settingsSource).not.toMatch(/Settings saved|Role duplicated|Role updated/i);
    expect(settingsSource).not.toMatch(/Your download will start shortly|Renews 8 Jul 2026/i);
    expect(settingsSource).not.toMatch(/Permission changes apply to everyone in this role/i);
  });
});
