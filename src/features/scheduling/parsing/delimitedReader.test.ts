import { describe, expect, it } from "vitest";
import { detectDelimiter, readDelimited } from "./delimitedReader";

function rowsOf(text: string, options?: Parameters<typeof readDelimited>[1]) {
  const result = readDelimited(text, options);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message ?? "read failed");
  return result.rows;
}

describe("detectDelimiter", () => {
  it("picks the delimiter for the whole document, not per line", () => {
    // One stray tab in a CSV must not make that row split differently.
    expect(detectDelimiter("a,b,c\nd,e,f\ng,h\ti")).toBe(",");
  });

  it("ignores delimiters inside quoted fields", () => {
    expect(detectDelimiter('"a,b,c,d,e"\tx')).toBe("\t");
  });

  it("defaults to tab when there is nothing to go on", () => {
    expect(detectDelimiter("single")).toBe("\t");
  });
});

describe("quote-aware decoding", () => {
  it("keeps an embedded comma inside a quoted field", () => {
    // The staff-import defect: `"Smith, John",Chef` used to become `"Smith` and ` John"`.
    expect(rowsOf('"Smith, John",Chef,Kitchen')).toEqual([["Smith, John", "Chef", "Kitchen"]]);
  });

  it("keeps an embedded newline inside a quoted field", () => {
    expect(rowsOf('"line one\nline two",Chef')).toEqual([["line one\nline two", "Chef"]]);
  });

  it("unescapes doubled quotes", () => {
    expect(rowsOf('"She said ""hi""",Chef')).toEqual([['She said "hi"', "Chef"]]);
  });

  it("handles CRLF the same as LF", () => {
    expect(rowsOf("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("refuses an unclosed quote rather than guessing", () => {
    const result = readDelimited('"Smith, John,Chef');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.diagnostics[0]?.code).toBe("malformed-quote");
  });

  it("refuses characters after a closed quoted field", () => {
    const result = readDelimited('"Smith"X,Chef');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.diagnostics[0]?.code).toBe("malformed-quote");
  });

  it("positions a quoting diagnostic to the row and column", () => {
    const result = readDelimited('a,b\nc,"d');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0]?.row).toBe(2);
    expect(result.diagnostics[0]?.column).toBe(2);
  });
});

describe("empty and blank input", () => {
  it("reports empty input", () => {
    const result = readDelimited("");
    expect(result.ok === false && result.diagnostics[0]?.code).toBe("empty-input");
  });

  it("reports input with no filled cells", () => {
    const result = readDelimited("\t\t\n\t\t");
    expect(result.ok === false && result.diagnostics[0]?.code).toBe("no-content");
  });

  it("drops trailing blank lines, which are an artefact of how text ends", () => {
    expect(rowsOf("a\tb\n\n")).toEqual([["a", "b"]]);
  });
});

describe("ragged rows", () => {
  it("pads short rows when the missing column is empty in every row", () => {
    // The usual spreadsheet case: a trailing column nobody filled in.
    expect(rowsOf("a\tb\t\nd\te")).toEqual([
      ["a", "b", ""],
      ["d", "e", ""],
    ]);
  });

  it("refuses when a missing column has content in another row", () => {
    // Ambiguous: the short row could mean "leave this alone" or "clear it", and
    // those are opposite instructions.
    const contested = readDelimited("a\tb\tKEEP\nd\te");
    expect(contested.ok).toBe(false);
    expect(contested.ok === false && contested.diagnostics[0]?.code).toBe("ragged-row");
  });

  it("leaves rows ragged when the caller asks for it", () => {
    expect(rowsOf("a\tb\tKEEP\nd\te", { allowRagged: true })).toEqual([
      ["a", "b", "KEEP"],
      ["d", "e"],
    ]);
  });
});
