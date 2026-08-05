import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildOpsBriefingPrintDocument,
  OPS_BRIEFING_PRINT_AMBIGUOUS,
  OPS_BRIEFING_PRINT_NONE,
  selectPrintableBriefing,
} from "./opsPrint";
import type { OpsBriefing } from "../types";

const briefing = (overrides: Partial<OpsBriefing> = {}): OpsBriefing => ({
  id: "briefing-1",
  locationId: "location-1",
  locationName: "Harbour Site",
  briefingDate: "2026-08-04",
  title: "Morning briefing",
  summary: "Two lifts down on level 3.\nAgency cover confirmed for the late shift.",
  authorName: "Dana Reed",
  createdAt: "2026-08-04T07:00:00Z",
  isToday: true,
  recipients: [],
  entryIds: [],
  ...overrides,
});

describe("Ops header Print briefing", () => {
  it("is labelled Print briefing and never prints the whole page", () => {
    const header = readFileSync("src/features/ops/components/OpsPageHeaderActions.tsx", "utf8");
    expect(header).toContain("Print briefing");
    expect(header).not.toContain("Print current view");
    expect(header).not.toContain("window.print");
    expect(header).toContain("props.onPrintBriefing");
  });

  it("selects today's briefing for the current location", () => {
    const target = selectPrintableBriefing(
      [
        briefing({ id: "yesterday", isToday: false }),
        briefing({ id: "other-location", locationId: "location-2" }),
        briefing({ id: "today" }),
      ],
      "location-1",
    );
    expect(target).toEqual({ status: "ready", briefing: expect.objectContaining({ id: "today" }) });
  });

  it("prints only the briefing payload, with no surrounding page content", () => {
    const document_ = buildOpsBriefingPrintDocument(briefing());
    expect(document_).toEqual({
      title: "Morning briefing",
      context: "Harbour Site · 2026-08-04 · Dana Reed",
      summary: "Two lifts down on level 3.\nAgency cover confirmed for the late shift.",
    });
    // The print contract carries no risks, metrics, filters, timeline or navigation chrome.
    const serialised = JSON.stringify(document_);
    for (const unrelated of ["risk", "metric", "Filters", "timeline", "Ops", "Sidebar", "nav"])
      expect(serialised).not.toContain(unrelated);
    expect(Object.keys(document_)).toEqual(["title", "context", "summary"]);
  });

  it("refuses truthfully when no briefing context can be produced", () => {
    expect(selectPrintableBriefing([], "location-1")).toEqual({ status: "none" });
    expect(selectPrintableBriefing([briefing({ isToday: false })], "location-1")).toEqual({
      status: "none",
    });
    expect(selectPrintableBriefing([briefing()], "location-9")).toEqual({ status: "none" });
    expect(OPS_BRIEFING_PRINT_NONE).toContain("nothing to print");
  });

  it("asks for a location instead of guessing when several locations briefed today", () => {
    const target = selectPrintableBriefing(
      [briefing({ id: "a" }), briefing({ id: "b", locationId: "location-2" })],
      null,
    );
    expect(target).toEqual({ status: "ambiguous" });
    expect(OPS_BRIEFING_PRINT_AMBIGUOUS).toContain("Select a location");
  });

  it("picks the newest briefing deterministically when one location briefed twice", () => {
    const target = selectPrintableBriefing(
      [
        briefing({ id: "early", createdAt: "2026-08-04T06:00:00Z" }),
        briefing({ id: "late", createdAt: "2026-08-04T11:00:00Z" }),
      ],
      "location-1",
    );
    expect(target).toMatchObject({ status: "ready", briefing: { id: "late" } });
  });
});
