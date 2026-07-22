import { describe, expect, it } from "vitest";
import { buildPrintableRota, PRINT_DAY_COUNT } from "./printableRotaModel";
import type { BuildPrintableRotaInput } from "./printableRotaModel";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";

const DAY_LABELS = ["Mon 20", "Tue 21", "Wed 22", "Thu 23", "Fri 24", "Sat 25", "Sun 26"];
const PRINTED_AT = new Date(2026, 6, 22, 15, 4);

function staff(id: string, name: string, role: string): StaffMember {
  return { id, name, role, hrs: "0", img: 1, tone: "info" };
}

function shift(
  id: string,
  dayIndex: RotaDayIndex,
  staffId: string | null,
  times: { start: string; end: string } = { start: "09:00", end: "17:00" },
  extra: Partial<DraftShift> = {},
): DraftShift {
  return {
    id,
    dayIndex,
    staffId,
    role: "Chef",
    start: times.start,
    end: times.end,
    breakMinutes: 30,
    tone: staffId === null ? "open" : "info",
    status: staffId === null ? "open" : "scheduled",
    ...extra,
  };
}

function build(overrides: Partial<BuildPrintableRotaInput> = {}) {
  return buildPrintableRota({
    workspaceName: "Harbour View Hotel",
    locationName: "Harbour View — Main",
    weekLabel: "20–26 Jul",
    dayLabels: DAY_LABELS,
    staff: [staff("a", "Ana Diaz", "Chef")],
    shifts: [shift("s1", 0, "a")],
    published: false,
    hasUnpublishedChanges: false,
    printedAt: PRINTED_AT,
    ...overrides,
  });
}

describe("day headers", () => {
  it("always renders seven day headers", () => {
    expect(build().dayLabels).toHaveLength(PRINT_DAY_COUNT);
    expect(build().dayLabels).toEqual(DAY_LABELS);
  });

  it("falls back to weekday names when labels are missing, never dropping a day", () => {
    const model = build({ dayLabels: ["Mon 20", "Tue 21"] });
    expect(model.dayLabels).toHaveLength(PRINT_DAY_COUNT);
    expect(model.dayLabels.slice(2)).toEqual(["Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("gives every staff row exactly seven day columns, including the weekend", () => {
    const model = build({
      staff: [staff("a", "Ana Diaz", "Chef")],
      shifts: [shift("sat", 5, "a"), shift("sun", 6, "a")],
    });
    expect(model.staffRows[0]!.days).toHaveLength(PRINT_DAY_COUNT);
    expect(model.staffRows[0]!.days[5]).toHaveLength(1);
    expect(model.staffRows[0]!.days[6]).toHaveLength(1);
  });
});

describe("staff rows", () => {
  it("renders every supplied staff member, including those with no shifts", () => {
    const model = build({
      staff: [staff("a", "Ana", "Chef"), staff("b", "Ben", "Bar"), staff("c", "Cal", "Bar")],
      shifts: [shift("s1", 0, "a")],
    });
    expect(model.staffRows.map((row) => row.name)).toEqual(["Ana", "Ben", "Cal"]);
    expect(model.staffRows[1]!.days.every((day) => day.length === 0)).toBe(true);
  });

  it("keeps a staff member's shifts out of other people's rows", () => {
    const model = build({
      staff: [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
      shifts: [shift("s1", 0, "a"), shift("s2", 0, "b")],
    });
    expect(model.staffRows[0]!.days[0]).toHaveLength(1);
    expect(model.staffRows[1]!.days[0]).toHaveLength(1);
  });
});

describe("split shifts", () => {
  it("renders each half separately and in time order", () => {
    const model = build({
      shifts: [
        shift("pm", 0, "a", { start: "17:00", end: "22:00" }),
        shift("am", 0, "a", { start: "09:00", end: "12:00" }),
      ],
    });
    const day = model.staffRows[0]!.days[0]!;
    expect(day).toHaveLength(2);
    expect(day.map((s) => `${s.start}-${s.end}`)).toEqual(["09:00-12:00", "17:00-22:00"]);
  });
});

describe("open shifts", () => {
  it("collects unassigned shifts into their own row and flags them", () => {
    const model = build({
      shifts: [shift("open1", 2, null, { start: "18:00", end: "23:00" })],
    });
    expect(model.openShiftDays[2]).toHaveLength(1);
    expect(model.openShiftDays[2]![0]!.open).toBe(true);
    expect(model.staffRows[0]!.days[2]).toHaveLength(0);
  });

  it("marks an open-status shift as open even if it still carries a staff id", () => {
    const model = build({ shifts: [shift("s1", 0, "a", undefined, { status: "open" })] });
    expect(model.staffRows[0]!.days[0]![0]!.open).toBe(true);
  });
});

describe("status labels", () => {
  it("labels an unpublished week as Draft", () => {
    const model = build({ published: false, hasUnpublishedChanges: false });
    expect(model.status.label).toBe("Draft");
    expect(model.status.detail).toContain("not published");
  });

  it("labels a published week as Published", () => {
    const model = build({ published: true, hasUnpublishedChanges: false });
    expect(model.status.label).toBe("Published");
  });

  it("labels edits after publication as Unpublished changes", () => {
    const model = build({ published: true, hasUnpublishedChanges: true });
    expect(model.status.label).toBe("Unpublished changes");
    expect(model.status.detail).toContain("previously published");
  });
});

describe("privacy", () => {
  it("carries no labour, cost, readiness or manager identity anywhere in the model", () => {
    const model = build({
      staff: [staff("a", "Ana", "Chef")],
      shifts: [shift("s1", 0, "a"), shift("s2", 1, null)],
      published: true,
      hasUnpublishedChanges: true,
    });
    const serialised = JSON.stringify(model).toLowerCase();
    for (const banned of [
      "cost",
      "labour",
      "labor",
      "wage",
      "pay",
      "salary",
      "readiness",
      "conflict",
      "coverage",
      "@",
      "budget",
      "hrs",
    ]) {
      expect(serialised).not.toContain(banned);
    }
  });

  it("does not copy the staff tone/avatar/hours fields onto the printed row", () => {
    const model = build();
    expect(Object.keys(model.staffRows[0]!).sort()).toEqual(["days", "key", "name", "role"]);
  });
});

describe("identity and week range", () => {
  it("renders workspace, location and week range", () => {
    const model = build();
    expect(model.workspaceName).toBe("Harbour View Hotel");
    expect(model.locationName).toBe("Harbour View — Main");
    expect(model.weekLabel).toBe("20–26 Jul");
    expect(model.printedAt).toBe("22/07/2026 15:04");
  });

  it("falls back to honest defaults when workspace or location is unknown", () => {
    const model = build({ workspaceName: null, locationName: "   " });
    expect(model.workspaceName).toBe("DocklistAI");
    expect(model.locationName).toBe("All locations");
  });
});

describe("workspace and location header line", () => {
  it("prints the name once when workspace and location are identical", () => {
    const model = build({
      workspaceName: "Harbour View Hotel",
      locationName: "Harbour View Hotel",
    });
    expect(model.identityLine).toBe("Harbour View Hotel");
  });

  it("prints the name once when they differ only by case or whitespace", () => {
    expect(
      build({ workspaceName: "Harbour View Hotel", locationName: "harbour view hotel" })
        .identityLine,
    ).toBe("Harbour View Hotel");
    expect(
      build({ workspaceName: "  Harbour View Hotel  ", locationName: "Harbour View Hotel" })
        .identityLine,
    ).toBe("Harbour View Hotel");
    expect(
      build({ workspaceName: "Harbour View Hotel", locationName: "  HARBOUR VIEW HOTEL " })
        .identityLine,
    ).toBe("Harbour View Hotel");
  });

  it("prints both when workspace and location genuinely differ", () => {
    const model = build({
      workspaceName: "Harbour View Group",
      locationName: "Harbour View — Quayside",
    });
    expect(model.identityLine).toBe("Harbour View Group · Harbour View — Quayside");
  });

  it("handles a missing location without collapsing or throwing", () => {
    const model = build({ workspaceName: "Harbour View Hotel", locationName: null });
    expect(model.locationName).toBe("All locations");
    expect(model.identityLine).toBe("Harbour View Hotel · All locations");
  });

  it("keeps both defaults when neither is known, since they are different labels", () => {
    const model = build({ workspaceName: null, locationName: null });
    expect(model.identityLine).toBe("DocklistAI · All locations");
  });
});

describe("missing department data", () => {
  it("renders a null department rather than inventing one", () => {
    const model = build({ shifts: [shift("s1", 0, "a")] });
    expect(model.staffRows[0]!.days[0]![0]!.department).toBeNull();
  });

  it("uses the draft department label when one is set", () => {
    const model = build({
      shifts: [shift("s1", 0, "a", undefined, { deptOverride: "Kitchen" })],
    });
    expect(model.staffRows[0]!.days[0]![0]!.department).toBe("Kitchen");
  });

  it("omits a zero break rather than printing '0m break'", () => {
    const model = build({ shifts: [shift("s1", 0, "a", undefined, { breakMinutes: 0 })] });
    expect(model.staffRows[0]!.days[0]![0]!.breakMinutes).toBeNull();
  });
});

describe("duplicate staff names", () => {
  it("disambiguates by role when two people share a name", () => {
    const model = build({
      staff: [staff("a", "Sam Lee", "Chef"), staff("b", "Sam Lee", "Bar")],
      shifts: [],
    });
    expect(model.staffRows.map((row) => row.name)).toEqual(["Sam Lee (Chef)", "Sam Lee (Bar)"]);
  });

  it("falls back to an occurrence number when name and role both collide", () => {
    const model = build({
      staff: [staff("a", "Sam Lee", "Chef"), staff("b", "Sam Lee", "Chef")],
      shifts: [],
    });
    expect(model.staffRows.map((row) => row.name)).toEqual([
      "Sam Lee (Chef 1)",
      "Sam Lee (Chef 2)",
    ]);
  });

  it("leaves unique names untouched", () => {
    const model = build({
      staff: [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
      shifts: [],
    });
    expect(model.staffRows.map((row) => row.name)).toEqual(["Ana", "Ben"]);
  });
});

describe("empty rota", () => {
  it("prints an honest empty state instead of a blank table", () => {
    const model = build({ staff: [staff("a", "Ana", "Chef")], shifts: [] });
    expect(model.hasAnyShift).toBe(false);
    expect(model.emptyMessage).toBe("No shifts scheduled for this week yet.");
  });

  it("reports content when only an open shift exists", () => {
    const model = build({ staff: [], shifts: [shift("open1", 0, null)] });
    expect(model.hasAnyShift).toBe(true);
    expect(model.emptyMessage).toBeNull();
  });

  it("handles a completely empty workspace without throwing", () => {
    const model = build({ staff: [], shifts: [] });
    expect(model.staffRows).toEqual([]);
    expect(model.dayLabels).toHaveLength(PRINT_DAY_COUNT);
    expect(model.emptyMessage).not.toBeNull();
  });
});
