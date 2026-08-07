import { describe, expect, it } from "vitest";
import {
  applyRequestFor,
  canApply,
  DEFAULT_DATE_ORDER,
  importDrawerReducer,
  initialImportDrawerState,
  operationCountLabel,
  previewRows,
  type ImportDrawerEvent,
  type ImportDrawerState,
} from "./importScheduleDrawerState";
import { importScheduleAvailability } from "../../lib/serverActionAvailability";
import { importHeadedSchedule } from "@/features/scheduling/parsing/headedScheduleImport";
import { MAX_PROPOSAL_OPERATIONS } from "../../lib/scheduling/buildWeekProposal";
import type { ImportScheduleResult } from "../../api/importScheduleProposal";
import type { ProposalOperation } from "../../lib/scheduling/buildWeekProposal";

/**
 * Phase 51: what the drawer does when the week does not exist yet, and what it
 * says about a paste that is too large to apply.
 *
 * The fresh-week case is a *state machine* question rather than a database one:
 * the proposal comes back with `rotaWeekId: null`, and the whole question is
 * whether the coordinates the apply needs to create that week survive the round
 * trip unchanged. If they do not, the apply either refuses as stale or writes to
 * the wrong week — both silent from the drawer's point of view.
 */

const WEEK = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];
const LIVE = importScheduleAvailability({ serverBacked: true, canEdit: true });

function preview(text: string) {
  return importHeadedSchedule(text, {
    dateOrder: "day-first",
    weekIsoDates: WEEK,
    locationId: "loc-1",
    staff: [{ id: "s1", name: "Ana Chef", active: true, roleName: "Chef" }],
    departments: [{ id: "dept-kitchen", name: "Kitchen", active: true }],
    defaultDepartmentId: "dept-kitchen",
  });
}

/** The proposal a fresh, empty week comes back with: no week id, real coordinates. */
function freshWeekResult(text: string): ImportScheduleResult {
  const parsed = preview(text);
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.diagnostics.find((entry) => entry.severity === "error")?.message ?? "refused",
      preview: parsed,
    };
  }
  const operations: ProposalOperation[] = parsed.rows
    .filter((row) => row.ok && row.shift)
    .map((row) => ({
      kind: "create-open" as const,
      signature: row.shift!.signature,
      roleName: row.shift!.roleName,
      reason: `Imported from row ${row.row}`,
    }));
  return {
    ok: true,
    rotaWeekId: null,
    locationId: "loc-1",
    weekStart: "2026-08-03",
    inputFingerprint: "absent-week-fingerprint",
    proposalDigest: "digest-xyz",
    applySource: {
      kind: "headed-import",
      id: null,
      contentVersion: `rows:${operations.length}`,
      plannerRuleVersion: "build-week/1",
    },
    operations,
    preview: parsed,
  };
}

function run(events: ImportDrawerEvent[], from = initialImportDrawerState()): ImportDrawerState {
  return events.reduce(importDrawerReducer, from);
}

const HEADER = "Date,Staff,Role,Start,End";
const PASTE = [HEADER, "2026-08-03,,Chef,09:00,17:00", "2026-08-04,,Chef,12:00,20:00"].join("\n");

describe("importing into a week that does not exist yet", () => {
  const reviewed = freshWeekResult(PASTE);
  const previewed = run([
    { type: "text-changed", text: PASTE },
    { type: "preview-returned", result: reviewed },
  ]);

  it("previews and enables the import with no week id at all", () => {
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.rotaWeekId).toBeNull();
    expect(previewRows(previewed)).toHaveLength(2);
    expect(canApply(previewed, LIVE)).toBe(true);
  });

  it("carries the coordinates the apply needs to create the week", () => {
    // Asserted, not assumed: a bare narrowing guard would turn a preview that
    // stopped succeeding into a test that silently checks nothing.
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    const request = applyRequestFor(reviewed);
    expect(request.rotaWeekId).toBeNull();
    expect(request.locationId).toBe("loc-1");
    expect(request.weekStart).toBe("2026-08-03");
    // Echoed, never rebuilt: the fingerprint is taken over this exact source and
    // the digest over this exact array.
    expect(request.source).toEqual(reviewed.applySource);
    expect(request.operations).toBe(reviewed.operations);
    expect(request.inputFingerprint).toBe(reviewed.inputFingerprint);
  });

  it("keeps the reviewed rows when the week appears before the import lands", () => {
    const refused = run(
      [
        { type: "apply-started" },
        {
          type: "apply-refused",
          message: "That week was created while this import was open.",
        },
      ],
      previewed,
    );
    expect(refused.error).toContain("created while this import was open");
    // Nothing is thrown away: the manager can reopen the week and press Import
    // again without pasting anything a second time.
    expect(refused.result).toBe(previewed.result);
    expect(refused.text).toBe(PASTE);
    expect(previewRows(refused)).toHaveLength(2);
    expect(canApply(refused, LIVE)).toBe(true);
  });

  it("keeps them for a replayed import too", () => {
    const replayed = run(
      [
        { type: "apply-started" },
        { type: "apply-refused", message: "That week now exists, so this import is out of date." },
      ],
      previewed,
    );
    expect(previewRows(replayed)).toHaveLength(2);
    expect(replayed.result).toBe(previewed.result);
  });
});

describe("date order", () => {
  it("defaults to day first, and keeps it across a close", () => {
    expect(DEFAULT_DATE_ORDER).toBe("day-first");
    expect(initialImportDrawerState().dateOrder).toBe("day-first");
    const closed = run([{ type: "text-changed", text: PASTE }, { type: "closed" }]);
    expect(closed.dateOrder).toBe("day-first");
    expect(closed.text).toBe("");
  });
});

describe("saying how much will be written", () => {
  // Eight hours apiece, so every row is a shift the rota would accept and the
  // only thing under test is how many of them there are.
  const bulk = (count: number) =>
    [
      HEADER,
      ...Array.from({ length: count }, (_, index) => {
        const start = String(index % 24).padStart(2, "0");
        const end = String((index + 8) % 24).padStart(2, "0");
        return `2026-08-03,,Chef,${start}:00,${end}:00`;
      }),
    ].join("\n");

  it("states the count against the limit on an ordinary paste", () => {
    const state = run([{ type: "preview-returned", result: freshWeekResult(PASTE) }]);
    expect(operationCountLabel(state)).toBe(`2 of a maximum ${MAX_PROPOSAL_OPERATIONS} shifts`);
  });

  it("disables the import and names both numbers when the paste is too large", () => {
    const result = freshWeekResult(bulk(MAX_PROPOSAL_OPERATIONS + 1));
    const state = run([{ type: "preview-returned", result }]);

    expect(result.ok).toBe(false);
    expect(canApply(state, LIVE)).toBe(false);
    expect(operationCountLabel(state)).toBe(
      `${MAX_PROPOSAL_OPERATIONS + 1} shifts — more than the ${MAX_PROPOSAL_OPERATIONS} one import can write`,
    );
    // And the rows are still there to look at, rather than an error on its own.
    expect(previewRows(state)).toHaveLength(MAX_PROPOSAL_OPERATIONS + 1);
  });

  it("still allows an import at exactly the limit", () => {
    const state = run([
      { type: "preview-returned", result: freshWeekResult(bulk(MAX_PROPOSAL_OPERATIONS)) },
    ]);
    expect(canApply(state, LIVE)).toBe(true);
    expect(operationCountLabel(state)).toBe(
      `${MAX_PROPOSAL_OPERATIONS} of a maximum ${MAX_PROPOSAL_OPERATIONS} shifts`,
    );
  });
});
