import { describe, expect, it } from "vitest";

import { MAX_IMPORT_TEXT_LENGTH } from "../../api/importScheduleProposal";
import {
  hasSupportedImportExtension,
  readImportFile,
  type ImportFileLike,
} from "./importSourceFile";
import { importDrawerReducer, initialImportDrawerState } from "./importScheduleDrawerState";
import {
  importHeadedSchedule,
  type HeadedImportOptions,
} from "@/features/scheduling/parsing/headedScheduleImport";

const WEEK = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];

function parserOptions(): HeadedImportOptions {
  return {
    dateOrder: "iso",
    weekIsoDates: WEEK,
    locationId: "loc-1",
    staff: [{ id: "s1", name: "Ana Chef", active: true, roleName: "Chef" }],
    departments: [{ id: "dept-kitchen", name: "Kitchen", active: true }],
    defaultDepartmentId: "dept-kitchen",
  };
}

function file(name: string, text: string): ImportFileLike {
  return { name, text: () => Promise.resolve(text) };
}

const CSV = "Date,Staff,Role,Start,End\n2026-08-03,Ana Chef,Chef,09:00,17:00\n";
const TSV = "Date\tStaff\tRole\tStart\tEnd\n2026-08-03\tAna Chef\tChef\t09:00\t17:00\n";

describe("supported import files", () => {
  it("accepts the text formats a spreadsheet can export", () => {
    expect(hasSupportedImportExtension("rota.csv")).toBe(true);
    expect(hasSupportedImportExtension("rota.tsv")).toBe(true);
    expect(hasSupportedImportExtension("rota.txt")).toBe(true);
    expect(hasSupportedImportExtension("ROTA.CSV")).toBe(true);
    expect(hasSupportedImportExtension("  week 32.csv  ")).toBe(true);
  });

  it("refuses a spreadsheet binary and says how to export it", async () => {
    const read = await readImportFile(file("August rota.xlsx", "PKbinary"));

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.message).toContain("August rota.xlsx");
    expect(read.ok === false && read.message).toContain("CSV");
  });

  it("reports a file the device could not read", async () => {
    const unreadable: ImportFileLike = {
      name: "rota.csv",
      text: () => Promise.reject(new Error("NotReadableError")),
    };

    const read = await readImportFile(unreadable);

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.message).toContain("could not be read");
  });

  it("refuses an empty file rather than previewing nothing", async () => {
    const read = await readImportFile(file("rota.csv", "   \n\n"));

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.message).toContain("empty");
  });

  it("refuses a file larger than one import can carry", async () => {
    const read = await readImportFile(file("rota.csv", "a".repeat(MAX_IMPORT_TEXT_LENGTH + 1)));

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.message).toContain("too large");
  });

  it("returns the file's bytes untouched", async () => {
    const read = await readImportFile(file("rota.csv", CSV));

    expect(read.ok).toBe(true);
    expect(read.ok === true && read.text).toBe(CSV);
    expect(read.ok === true && read.name).toBe("rota.csv");
  });
});

describe("a chosen file and a paste are the same import", () => {
  it("puts identical .csv bytes into identical drawer text", async () => {
    const read = await readImportFile(file("rota.csv", CSV));
    expect(read.ok).toBe(true);
    if (!read.ok) return;

    const fromFile = importDrawerReducer(initialImportDrawerState(), {
      type: "source-selected",
      text: read.text,
      sourceName: read.name,
    });
    const fromPaste = importDrawerReducer(initialImportDrawerState(), {
      type: "text-changed",
      text: CSV,
    });

    expect(fromFile.text).toBe(fromPaste.text);
    // Same input, so the parser cannot tell the two apart.
    expect(importHeadedSchedule(fromFile.text, parserOptions())).toEqual(
      importHeadedSchedule(fromPaste.text, parserOptions()),
    );
  });

  it("puts identical .tsv bytes into identical drawer text", async () => {
    const read = await readImportFile(file("rota.tsv", TSV));
    expect(read.ok).toBe(true);
    if (!read.ok) return;

    const fromFile = importDrawerReducer(initialImportDrawerState(), {
      type: "source-selected",
      text: read.text,
      sourceName: read.name,
    });

    expect(fromFile.text).toBe(TSV);
    expect(importHeadedSchedule(fromFile.text, parserOptions())).toEqual(
      importHeadedSchedule(TSV, parserOptions()),
    );
  });
});

describe("replacing the import source", () => {
  it("drops the previous file's reviewed preview when another is chosen", () => {
    const reviewed = {
      ...initialImportDrawerState(),
      text: CSV,
      sourceName: "week-31.csv",
      result: { ok: false, message: "stale" } as never,
      error: "stale",
    };

    const next = importDrawerReducer(reviewed, {
      type: "source-selected",
      text: TSV,
      sourceName: "week-32.tsv",
    });

    expect(next.text).toBe(TSV);
    expect(next.sourceName).toBe("week-32.tsv");
    expect(next.result).toBeNull();
    expect(next.error).toBeNull();
  });

  it("stops crediting a file once the manager edits the text", () => {
    const fromFile = importDrawerReducer(initialImportDrawerState(), {
      type: "source-selected",
      text: CSV,
      sourceName: "rota.csv",
    });

    const edited = importDrawerReducer(fromFile, { type: "text-changed", text: `${CSV}extra` });

    expect(edited.sourceName).toBeNull();
    expect(edited.text).toBe(`${CSV}extra`);
  });

  it("leaves the standing source alone when a file could not be read", () => {
    const fromFile = importDrawerReducer(initialImportDrawerState(), {
      type: "source-selected",
      text: CSV,
      sourceName: "rota.csv",
    });

    const failed = importDrawerReducer(fromFile, {
      type: "source-failed",
      message: "That file could not be read.",
    });

    expect(failed.text).toBe(CSV);
    expect(failed.sourceName).toBe("rota.csv");
    expect(failed.error).toBe("That file could not be read.");
  });

  it("forgets the file name when the drawer closes", () => {
    const fromFile = importDrawerReducer(initialImportDrawerState(), {
      type: "source-selected",
      text: CSV,
      sourceName: "rota.csv",
    });

    expect(importDrawerReducer(fromFile, { type: "closed" }).sourceName).toBeNull();
  });
});
