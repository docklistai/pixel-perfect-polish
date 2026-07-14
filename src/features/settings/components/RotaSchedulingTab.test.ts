import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rotaSchedulingSource = readFileSync(
  "src/features/settings/components/RotaSchedulingTab.tsx",
  "utf8",
);
const accessSource = readFileSync("src/features/settings/components/AccessTab.tsx", "utf8");

describe("scheduling settings honesty", () => {
  it("describes the live open-shift request and republish workflow without a preview toggle", () => {
    expect(rotaSchedulingSource).toContain("Eligible staff can request published open shifts");
    expect(rotaSchedulingSource).toContain("becomes final only when the rota is republished");
    expect(rotaSchedulingSource).not.toContain('label="Show open shifts to eligible staff"');
  });

  it("describes targeted published updates without a preview control", () => {
    expect(rotaSchedulingSource).toContain("Staff receive an in-app update");
    expect(rotaSchedulingSource).toContain("only");
    expect(rotaSchedulingSource).toContain("staff whose published shifts changed are notified");
    expect(rotaSchedulingSource).not.toContain('label="Staff app update on publish"');
  });

  it("removes shift-swap previews while retaining unrelated preview controls", () => {
    expect(`${rotaSchedulingSource}\n${accessSource}`).not.toMatch(/swap shifts|all swaps/i);
    expect(rotaSchedulingSource).toContain('label="Auto-apply break thresholds"');
    expect(rotaSchedulingSource).toContain('label="Approve overtime automatically"');
    expect(accessSource).toContain('label="Hide pay rates from supervisors"');
  });
});
