import { describe, expect, it } from "vitest";
import { cellReader, describeColumnMapping, mapColumns, REQUIRED_COLUMNS } from "./headedColumnMap";

/**
 * Header mapping, tested directly rather than only through a whole import.
 *
 * The rule worth pinning here is that an unrecognised header is *reported*, not
 * silently skipped: a mistyped "Strat" column and a genuinely absent start time
 * look identical to a manager until something names the column it ignored.
 */

describe("mapping headers to fields", () => {
  it("matches aliases regardless of case, spacing and column order", () => {
    const mapping = mapColumns(["  TO ", "From", "position", "Work   Date"]);
    expect(mapping.columns.map((column) => column.mappedTo)).toEqual([
      "end",
      "start",
      "role",
      "date",
    ]);
    expect(mapping.mapped.get("date")).toBe(3);
  });

  it("keeps the first column when a field is headed twice", () => {
    const mapping = mapColumns(["Date", "Day"]);
    expect(mapping.mapped.get("date")).toBe(0);
  });

  it("leaves an unrecognised header unmapped rather than guessing", () => {
    const mapping = mapColumns(["Date", "Strat", "End", "Role"]);
    expect(mapping.columns[1]!.mappedTo).toBeNull();
    expect(mapping.mapped.has("start")).toBe(false);
  });
});

describe("describing what the mapping found", () => {
  it("raises one error per missing required column", () => {
    const diagnostics = describeColumnMapping(mapColumns(["Staff"]));
    const missing = diagnostics.filter((entry) => entry.code === "missing-required-column");
    expect(missing).toHaveLength(REQUIRED_COLUMNS.length);
    expect(missing.every((entry) => entry.severity === "error")).toBe(true);
  });

  it("warns about an ignored column, naming it", () => {
    const diagnostics = describeColumnMapping(
      mapColumns(["Date", "Role", "Start", "End", "Notes"]),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.severity).toBe("warning");
    expect(diagnostics[0]!.message).toContain("Notes");
  });

  it("says nothing about a blank trailing header", () => {
    // A trailing delimiter is a formatting artefact, not a column somebody meant.
    expect(describeColumnMapping(mapColumns(["Date", "Role", "Start", "End", "   "]))).toEqual([]);
  });
});

describe("reading cells by field", () => {
  const mapping = mapColumns(["Date", "Role", "Start", "End"]);
  const read = cellReader(mapping);

  it("reads a mapped field by its column index", () => {
    expect(read(["2026-08-03", "Chef", "09:00", "17:00"], "role")).toBe("Chef");
  });

  it("returns empty for a field the file does not have", () => {
    expect(read(["2026-08-03", "Chef", "09:00", "17:00"], "department")).toBe("");
  });

  it("returns empty for a row that stops short of the column", () => {
    expect(read(["2026-08-03", "Chef"], "end")).toBe("");
  });
});
