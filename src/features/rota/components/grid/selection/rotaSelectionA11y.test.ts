import { describe, expect, it } from "vitest";
import { buildRotaCopyAnnouncement, buildRotaSelectionAnnouncement } from "./rotaSelectionA11y";

const base = {
  staffRowCount: 3,
  includesOpenRow: false,
  dayCount: 4,
  cellCount: 12,
  shiftCount: 7,
};

describe("buildRotaSelectionAnnouncement", () => {
  it("describes a staff-only rectangle", () => {
    expect(buildRotaSelectionAnnouncement(base)).toBe(
      "Selected 3 staff by 4 days. 12 cells, 7 shifts.",
    );
  });

  it("says nothing for a single cell, which focus already announces", () => {
    expect(buildRotaSelectionAnnouncement({ ...base, cellCount: 1 })).toBe("");
  });

  it("names the open-shift row when the rectangle reaches it", () => {
    expect(buildRotaSelectionAnnouncement({ ...base, includesOpenRow: true })).toBe(
      "Selected 3 staff and open shifts by 4 days. 12 cells, 7 shifts.",
    );
  });

  it("describes an open-row-only rectangle without a staff count", () => {
    expect(
      buildRotaSelectionAnnouncement({
        staffRowCount: 0,
        includesOpenRow: true,
        dayCount: 2,
        cellCount: 2,
        shiftCount: 0,
      }),
    ).toBe("Selected open shifts by 2 days. 2 cells, 0 shifts.");
  });

  it("uses singular wording throughout", () => {
    expect(
      buildRotaSelectionAnnouncement({
        staffRowCount: 1,
        includesOpenRow: false,
        dayCount: 2,
        cellCount: 2,
        shiftCount: 1,
      }),
    ).toBe("Selected 1 staff member by 2 days. 2 cells, 1 shift.");
  });
});

describe("buildRotaCopyAnnouncement", () => {
  it("reports what reached the clipboard", () => {
    expect(buildRotaCopyAnnouncement(12, 7)).toBe("Copied 12 cells, 7 shifts.");
    expect(buildRotaCopyAnnouncement(1, 1)).toBe("Copied 1 cell, 1 shift.");
  });
});
