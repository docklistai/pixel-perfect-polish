import { describe, expect, it } from "vitest";
import { serialiseRotaCell, serialiseRotaSelectionTsv } from "./rotaCellSerializer";
import { parseInlineCellInput } from "../inlineCellParsing";
import type { DraftShift, RotaDayIndex } from "../../../types";

let counter = 0;
function shift(overrides: Partial<DraftShift> = {}): DraftShift {
  counter += 1;
  return {
    id: `s-${counter}`,
    dayIndex: 0 as RotaDayIndex,
    staffId: "staff-1",
    role: "Bar",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...overrides,
  };
}

describe("serialiseRotaCell", () => {
  it("serialises an empty cell as an empty field", () => {
    expect(serialiseRotaCell([])).toBe("");
  });

  it("serialises a single assigned shift with role and break", () => {
    expect(serialiseRotaCell([shift()])).toBe("09:00-17:00 Bar 30m break");
  });

  it("marks an unassigned shift as open", () => {
    expect(
      serialiseRotaCell([shift({ staffId: null, status: "open", start: "18:00", end: "23:00" })]),
    ).toBe("open 18:00-23:00 Bar 30m break");
  });

  it("writes a zero break as 'no break' rather than omitting it", () => {
    expect(serialiseRotaCell([shift({ breakMinutes: 0 })])).toBe("09:00-17:00 Bar no break");
  });

  it("keeps a shared role once at the end of a split cell", () => {
    const cell = [shift({ start: "09:00", end: "12:00" }), shift({ start: "17:00", end: "22:00" })];
    expect(serialiseRotaCell(cell)).toBe("09:00-12:00 30m break / 17:00-22:00 30m break Bar");
  });

  it("keeps differing roles attached to their own segment", () => {
    const cell = [
      shift({ start: "09:00", end: "12:00", role: "Bar" }),
      shift({ start: "17:00", end: "22:00", role: "Kitchen" }),
    ];
    expect(serialiseRotaCell(cell)).toBe(
      "09:00-12:00 Bar 30m break / 17:00-22:00 Kitchen 30m break",
    );
  });

  it("orders split segments by start time regardless of stored order", () => {
    const cell = [
      shift({ start: "17:00", end: "22:00", role: "Kitchen" }),
      shift({ start: "09:00", end: "12:00", role: "Bar" }),
    ];
    expect(serialiseRotaCell(cell).startsWith("09:00-12:00 Bar")).toBe(true);
  });

  it("emits deterministic zero-padded 24-hour times", () => {
    // "9:00" would let the parser infer an afternoon start; "09:00" cannot.
    expect(serialiseRotaCell([shift({ start: "9:00", end: "5:30" })])).toBe(
      "09:00-05:30 Bar 30m break",
    );
  });

  it("keeps free-text role labels from breaking the TSV grid", () => {
    expect(serialiseRotaCell([shift({ role: "Bar\tTraining\nCover" })])).toBe(
      "09:00-17:00 Bar Training Cover 30m break",
    );
  });
});

describe("serialiseRotaSelectionTsv", () => {
  it("preserves the selected rectangle's shape with no trailing newline", () => {
    const tsv = serialiseRotaSelectionTsv([
      [[shift()], []],
      [[], [shift({ start: "12:00", end: "20:00", role: "Kitchen" })]],
    ]);
    expect(tsv).toBe("09:00-17:00 Bar 30m break\t\n\t12:00-20:00 Kitchen 30m break");
    expect(tsv.endsWith("\n")).toBe(false);
    expect(tsv.split("\n")).toHaveLength(2);
    expect(tsv.split("\n")[0]!.split("\t")).toHaveLength(2);
  });

  it("keeps a fully empty rectangle as empty fields, not as nothing", () => {
    expect(serialiseRotaSelectionTsv([[[], []]])).toBe("\t");
  });

  it("serialises a single cell without separators", () => {
    expect(serialiseRotaSelectionTsv([[[shift()]]])).toBe("09:00-17:00 Bar 30m break");
  });
});

describe("round-trip through the inline cell parser", () => {
  const cases: { name: string; cell: DraftShift[] }[] = [
    { name: "single assigned shift", cell: [shift()] },
    { name: "zero break", cell: [shift({ breakMinutes: 0 })] },
    { name: "non-default break", cell: [shift({ breakMinutes: 45 })] },
    {
      name: "open shift",
      cell: [shift({ staffId: null, status: "open", start: "18:00", end: "23:00" })],
    },
    {
      name: "split with shared role",
      cell: [shift({ start: "09:00", end: "12:00" }), shift({ start: "17:00", end: "22:00" })],
    },
    {
      name: "split with differing roles",
      cell: [
        shift({ start: "09:00", end: "12:00", role: "Bar" }),
        shift({ start: "17:00", end: "22:00", role: "Kitchen" }),
      ],
    },
  ];

  for (const { name, cell } of cases) {
    it(`reads back ${name} unchanged`, () => {
      const parsed = parseInlineCellInput(serialiseRotaCell(cell), { roleOptions: ["Bar"] });
      expect(parsed.kind).toBe("shifts");
      if (parsed.kind !== "shifts") return;
      expect(
        parsed.shifts.map((s) => ({
          start: s.start,
          end: s.end,
          role: s.role,
          breakMinutes: s.breakMinutes,
          open: s.open,
        })),
      ).toEqual(
        cell.map((s) => ({
          start: s.start,
          end: s.end,
          role: s.role,
          breakMinutes: s.breakMinutes,
          open: s.staffId === null,
        })),
      );
    });
  }

  it("reads an empty cell back as a clear, not as an error", () => {
    expect(parseInlineCellInput(serialiseRotaCell([]))).toEqual({ kind: "clear", all: false });
  });
});
