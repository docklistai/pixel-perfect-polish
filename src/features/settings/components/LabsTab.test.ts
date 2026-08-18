import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { settingsTabs, visibleSettingsTabs } from "../data/settingsTabs";

const labsSource = readFileSync("src/features/settings/components/LabsTab.tsx", "utf8");
const toggleRowSource = readFileSync("src/features/settings/components/LabsToggleRow.tsx", "utf8");
const labsApiSource = readFileSync("src/features/settings/api/workspaceLabs.ts", "utf8");

/** Code only — prose that *names* a rejected pattern must not fail its own check. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
const labsApiCode = stripComments(labsApiSource);
/** JSX only, so the prohibition written in the file's own doc comment is not read as copy. */
const labsCode = stripComments(labsSource);

describe("Labs tab is pilot-visible and genuinely persisted", () => {
  it("ships in the live pilot, which requires every control to persist", () => {
    const labs = settingsTabs.find((tab) => tab.t === "Labs");
    expect(labs).toBeDefined();
    expect(labs!.pilot).toBe(true);
    expect(visibleSettingsTabs(true).map((tab) => tab.t)).toContain("Labs");
  });

  it("uses the persisting toggle, never the local-state preview one", () => {
    expect(labsSource).toContain("LabsToggleRow");
    expect(labsSource).toContain("useSaveWorkspaceLabs");
    expect(labsSource).not.toMatch(/\bToggleRow\b(?!\s*from "\.\/LabsToggleRow")/);
    expect(labsSource).not.toContain('from "./SettingsPrimitives"\nimport { ToggleRow }');
  });

  it("blocks the toggle while the stored value is unknown or saving", () => {
    expect(labsSource).toContain("disabled={!labs.enabled || labs.isLoading || labs.isError}");
    expect(labsSource).toContain("pending={save.isPending}");
    expect(toggleRowSource).toContain("const locked = pending || disabled;");
  });
});

describe("Time Pulse Labs entry", () => {
  it("defaults off in the shared default and is a real boolean flag", () => {
    expect(labsApiSource).toContain("LABS_FLAGS_OFF: WorkspaceLabsFlags = { timePulse: false }");
    expect(labsApiSource).toContain("labs_time_pulse_enabled");
    // Typed column, never a jsonb bag or a per-user flag.
    expect(labsApiCode).not.toMatch(/jsonb|flags_json|user_id/i);
  });
});

describe("Predictive Absence is permanently dropped, not advertised", () => {
  it("is named nowhere in what Labs renders", () => {
    // Dropped means absent. An entry here would advertise a roadmap the product
    // has abandoned, which is why no wording of it is allowed in the JSX.
    expect(labsCode).not.toMatch(/predictive/i);
    expect(labsCode).not.toMatch(/absence probability|absence risk|likely to be absent/i);
  });

  it("is not smuggled back as a teaser, placeholder, or dead toggle", () => {
    expect(labsCode).not.toMatch(/coming soon|coming to labs|not available yet|planned/i);
    expect(labsCode).not.toMatch(/coverage fragility|ghost (shift|suggestion)/i);
    // Every toggle rendered here must be a real persisted experiment.
    const toggles = labsCode.match(/<LabsToggleRow/g) ?? [];
    expect(toggles).toHaveLength(1);
    expect(labsCode).not.toContain("<SettingsToggle");
  });

  it("has no predictive flag, column, or persisted state anywhere behind it", () => {
    expect(labsCode).not.toMatch(/predictive[_A-Za-z]*(Enabled|Toggle)/i);
    expect(labsApiSource).not.toMatch(/predictive/i);
    // The only Labs flag that exists is the Time Pulse one.
    expect(labsApiSource).toContain("LABS_FLAGS_OFF: WorkspaceLabsFlags = { timePulse: false }");
  });
});

describe("Labs advertises no scoring or profiling of any kind", () => {
  it("creates none of the forbidden scoring or profiling fields", () => {
    const surface = `${labsSource}\n${labsApiSource}`;
    expect(surface).not.toMatch(
      /punctuality_score|performance_score|energy_level|absence_probability|staff_risk|ai_insights/i,
    );
  });

  it("uses no judgement vocabulary in its copy", () => {
    // Reassurance copy may legitimately say what Labs will *not* do ("nothing
    // here scores, ranks, or profiles"), so only judgements *about a person*
    // are banned outright.
    expect(labsCode).not.toMatch(/no.?show|unreliable|late risk|at.?risk|engagement/i);
  });
});
