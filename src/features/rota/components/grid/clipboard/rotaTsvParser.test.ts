import { describe, expect, it } from "vitest";
import { parseRotaTsvClipboard } from "./rotaTsvParser";

function rows(result: ReturnType<typeof parseRotaTsvClipboard>) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.message}`);
  return result.rows;
}

describe("parseRotaTsvClipboard", () => {
  it("parses a plain tab/newline block", () => {
    expect(rows(parseRotaTsvClipboard("a\tb\tc\nd\te\tf"))).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  it("handles CRLF line endings from Excel on Windows", () => {
    expect(rows(parseRotaTsvClipboard("a\tb\r\nc\td"))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles lone CR line endings", () => {
    expect(rows(parseRotaTsvClipboard("a\tb\rc\td"))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("drops a single trailing newline rather than adding a blank row", () => {
    expect(rows(parseRotaTsvClipboard("a\tb\nc\td\n"))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps a genuine empty leading field", () => {
    expect(rows(parseRotaTsvClipboard("\t9-5 Bar"))).toEqual([["", "9-5 Bar"]]);
  });

  it("reads a quoted field with an inner tab as one cell", () => {
    expect(rows(parseRotaTsvClipboard('"a\tb"\tc'))).toEqual([["a\tb", "c"]]);
  });

  it("reads a quoted field with an inner newline as one cell", () => {
    expect(rows(parseRotaTsvClipboard('"line1\nline2"\tb'))).toEqual([["line1\nline2", "b"]]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(rows(parseRotaTsvClipboard('"she said ""hi"""\tb'))).toEqual([['she said "hi"', "b"]]);
  });

  it("rejects an unclosed quote instead of guessing", () => {
    const result = parseRotaTsvClipboard('"never closed\tb');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/unclosed quote/i);
      expect(result.message).toMatch(/row 1, column 1/i);
    }
  });

  it.each(['a"b"', '"a"junk', 'a"'])("rejects malformed quote placement in %s", (text) => {
    const result = parseRotaTsvClipboard(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/row 1, column 1/i);
  });

  it("rejects characters after a closed quoted field and names that cell", () => {
    const result = parseRotaTsvClipboard('ok\t"a"x\nnext\tcell');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/row 1, column 2/i);
      expect(result.message).toMatch(/after a closed quoted field/i);
    }
  });

  it("keeps trailing empty fields after correctly quoted content", () => {
    expect(rows(parseRotaTsvClipboard('"a"\t\t'))).toEqual([["a", "", ""]]);
  });

  it("normalises ragged rows when only trailing fields are missing", () => {
    // Second row is short but nothing has content in the missing column.
    expect(rows(parseRotaTsvClipboard("9-5 Bar\t\nOFF"))).toEqual([
      ["9-5 Bar", ""],
      ["OFF", ""],
    ]);
  });

  it("blocks ragged rows when a short row omits a populated column", () => {
    // Column 2 has content in row 0 but is missing from row 1: ambiguous.
    const result = parseRotaTsvClipboard("9-5\t10-4\nOFF");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/not the same width/i);
  });

  it("rejects an empty clipboard", () => {
    expect(parseRotaTsvClipboard("").ok).toBe(false);
  });

  it("rejects a clipboard that is only blank cells", () => {
    expect(parseRotaTsvClipboard("\t\n\t").ok).toBe(false);
  });
});
