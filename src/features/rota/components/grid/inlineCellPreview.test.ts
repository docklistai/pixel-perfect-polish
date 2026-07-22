import { describe, expect, it } from "vitest";
import { buildInlineCellPreview } from "./inlineCellPreview";

const options = { roleOptions: ["Bar", "Waiter"] };

function summary(value: string): string {
  return buildInlineCellPreview(value, options).summary;
}

describe("buildInlineCellPreview", () => {
  it("stays idle for empty input", () => {
    expect(buildInlineCellPreview("", options)).toEqual({ tone: "idle", summary: "" });
    expect(buildInlineCellPreview("   ", options).tone).toBe("idle");
  });

  it("reads back a single shift", () => {
    expect(summary("9-5 Bar")).toBe("09:00–17:00 · Bar");
  });

  it("reads back a split shift with a shared role", () => {
    expect(summary("9-12, 5-10 Bar")).toBe("09:00–12:00 + 17:00–22:00 · Bar");
  });

  it("reads back a break", () => {
    expect(summary("9-5 30m break")).toBe("09:00–17:00 · 30m break");
    expect(summary("9-5 no break")).toBe("09:00–17:00 · no break");
  });

  it("reads back role and break together", () => {
    expect(summary("9-5 30m break Bar")).toBe("09:00–17:00 · Bar · 30m break");
  });

  it("attaches per-segment roles when they differ", () => {
    expect(summary("9-12 waiter / 17-22 bar")).toBe("09:00–12:00 Waiter + 17:00–22:00 Bar");
  });

  it("marks open shifts", () => {
    expect(summary("open 6pm-11pm bar")).toBe("18:00–23:00 · Bar · open");
  });

  it("describes clear commands without implying a leave record", () => {
    const expected = "No shift scheduled — this does not record leave or unavailability";
    expect(summary("clear")).toBe(expected);
    expect(summary("off")).toBe(expected);
    expect(summary("day off")).toBe(expected);
    expect(summary("delete")).toBe(expected);
    expect(summary("delete all")).toBe(`${expected} (every shift in this cell)`);
  });

  it("surfaces the parse error as a blocking preview", () => {
    const preview = buildInlineCellPreview("9-5 Sommelier", options);
    expect(preview.tone).toBe("error");
    expect(preview.summary).toContain("not one of your roles");
  });

  it("blocks on malformed times", () => {
    expect(buildInlineCellPreview("nine to five", options).tone).toBe("error");
  });

  it.each([
    ["holiday", "Use Leave to record or approve holiday"],
    ["annual leave", "Use Leave to record or approve holiday"],
    ["leave", "Use Leave to record or approve holiday"],
    ["unavailable", "Use staff unavailability to record this"],
    ["sick", "Sickness recording is not available in this pilot"],
    ["sickness", "Sickness recording is not available in this pilot"],
  ])("redirects %s to the surface that owns the record", (input, message) => {
    const preview = buildInlineCellPreview(input, options);
    // "blocked", not "error": the manager typed something meaningful.
    expect(preview.tone).toBe("blocked");
    expect(preview.summary).toBe(message);
  });

  it("treats blocked commands case- and punctuation-insensitively", () => {
    expect(buildInlineCellPreview("Annual Leave", options).tone).toBe("blocked");
    expect(buildInlineCellPreview("SICK", options).tone).toBe("blocked");
  });
});
