import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");
const route = source("src/routes/ops.tsx");
const overlays = source("src/features/ops/components/OpsPageOverlays.tsx");
const headerActions = source("src/features/ops/components/OpsPageHeaderActions.tsx");
const briefingPrint = source("src/features/ops/lib/opsPrint.ts");
const entriesMigration = source("supabase/migrations/20260803090000_phase50_ops_entries.sql");
const collaborationMigration = source(
  "supabase/migrations/20260803090100_phase50_ops_handovers_briefings.sql",
);
const checklistMigration = source("supabase/migrations/20260803090200_phase50_ops_checklists.sql");
const readMigration = source("supabase/migrations/20260803090300_phase50_ops_read_and_export.sql");

describe("Phase 50 Ops honesty and controls", () => {
  it("is a normal manager route with no preview or sample fallback", () => {
    expect(route).toContain("requireManagerAccess(context.auth)");
    expect(route).not.toMatch(/requirePreviewSurface|opsPreview|opsDemoData|preview-only/i);
    expect(route).not.toMatch(/>\s*Sample\s*</i);
    expect(route).toContain("no sample data has been substituted");
  });

  it("wires every existing surface to real handlers", () => {
    const routeBundle = `${route}\n${overlays}\n${headerActions}\n${briefingPrint}`;
    for (const control of [
      "OpsFilterBar",
      "OpsStatCards",
      "OpsRiskPanel",
      "OpsTimeline",
      "OpsRightRail",
      "OpsLogEntryModal",
      "OpsHandoverModal",
      "OpsBriefingDialog",
      "OpsChecklistDialog",
      "OpsDetailDrawer",
      "OpsArchiveDialog",
      "exportCsv",
      "printOpsBriefing",
    ])
      expect(routeBundle).toContain(control);
    expect(routeBundle).not.toMatch(/onDelete|Delete entry|notifyOpsPreview/);
    // The header prints the operational briefing, never the whole Ops page.
    expect(headerActions).toContain("Print briefing");
    expect(routeBundle).not.toContain("window.print()");
    expect(routeBundle).not.toContain("Print current view");
  });

  it("uses explicit columns and no icon/tone domain inference", () => {
    expect(
      [entriesMigration, collaborationMigration, checklistMigration, readMigration].join("\n"),
    ).not.toMatch(/select\s+(?:\*|[a-z_]+\.\*)/i);
    expect(readMigration).toContain("entry.entry_type <> 'incident'");
    expect(source("src/features/ops/components/OpsTimeline.tsx")).not.toMatch(
      /entry\.icon|entry\.tone|entry\.dot/,
    );
  });

  it("keeps all writes in definer RPCs and deterministic refusals out of 40001", () => {
    const sql = [entriesMigration, collaborationMigration, checklistMigration, readMigration].join(
      "\n",
    );
    expect(sql).not.toContain("40001");
    expect(sql.match(/security definer/g)?.length).toBeGreaterThanOrEqual(20);
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("ops_entry_events_reject_changes");
  });

  it("keeps staff broadcasts and manager briefings separate", () => {
    const adr = source("docs/adr/0003-team-broadcasts-and-ops-briefings.md");
    expect(adr).toContain("Team owns staff broadcasts");
    expect(adr).toContain("Ops owns manager operational briefings");
  });

  it("lets the shared dialog contract capture and restore each Ops opener", () => {
    const dialogs = [
      "OpsLogEntryModal",
      "OpsHandoverModal",
      "OpsBriefingDialog",
      "OpsChecklistDialog",
      "OpsArchiveDialog",
    ]
      .map((name) => source(`src/features/ops/components/${name}.tsx`))
      .join("\n");
    expect(dialogs).not.toContain("autoFocus");
  });
});
