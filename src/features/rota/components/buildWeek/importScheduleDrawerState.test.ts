import { describe, expect, it } from "vitest";
import {
  APPLY_FAILURE_MESSAGE,
  applyLabel,
  applyRequestFor,
  canApply,
  canPreview,
  importDrawerReducer,
  initialImportDrawerState,
  PREVIEW_FAILURE_MESSAGE,
  previewLabel,
  previewRows,
  type ImportDrawerEvent,
  type ImportDrawerState,
} from "./importScheduleDrawerState";
import { importScheduleAvailability } from "../../lib/serverActionAvailability";
import { importHeadedSchedule } from "@/features/scheduling/parsing/headedScheduleImport";
import type { ImportScheduleResult } from "../../api/importScheduleProposal";
import type { ProposalOperation } from "../../lib/scheduling/buildWeekProposal";

/**
 * The import drawer's behaviour, driven through its state machine.
 *
 * These are interaction tests without a DOM: the repo's Vitest runs in a node
 * environment with no React renderer by deliberate configuration, so the drawer's
 * decisions were extracted to a pure module rather than a jsdom dependency being
 * added to test them. Rendering itself is covered by the browser journey.
 *
 * The preview results here are produced by the real parser, not hand-written, so
 * "blocking errors disable the confirmation" is asserted against what a manager
 * would actually get back from a paste.
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

function parse(text: string, dateOrder: "iso" | "day-first" | "month-first" = "iso") {
  return importHeadedSchedule(text, {
    dateOrder,
    weekIsoDates: WEEK,
    locationId: "loc-1",
    staff: [
      { id: "s1", name: "Ana Chef", active: true },
      { id: "s2", name: "Ben Carter", active: true },
      { id: "s3", name: "Ben Carter", active: true },
    ],
    departments: [
      { id: "dept-kitchen", name: "Kitchen", active: true },
      { id: "dept-bar", name: "Bar", active: true },
    ],
    defaultDepartmentId: "dept-kitchen",
  });
}

/**
 * Builds the server result the drawer would receive for a given paste.
 *
 * `rotaWeekId` is null for the fresh-week case, exactly as the server function
 * returns it when no rota_weeks row exists yet.
 */
function serverResult(
  text: string,
  dateOrder?: "iso" | "day-first" | "month-first",
  rotaWeekId: string | null = "week-1",
): ImportScheduleResult {
  const preview = parse(text, dateOrder);
  if (!preview.ok) {
    return {
      ok: false,
      message:
        preview.diagnostics.find((entry) => entry.severity === "error")?.message ??
        "Nothing in that paste could be imported.",
      preview,
    };
  }
  const operations: ProposalOperation[] = preview.rows
    .filter((row) => row.ok && row.shift)
    .map((row) =>
      row.shift!.staffId === null
        ? {
            kind: "create-open" as const,
            signature: row.shift!.signature,
            roleName: row.shift!.roleName,
            reason: `Imported from row ${row.row}`,
          }
        : {
            kind: "create-assigned" as const,
            signature: row.shift!.signature,
            roleName: row.shift!.roleName,
            staffId: row.shift!.staffId!,
            reason: `Imported from row ${row.row}`,
          },
    );
  return {
    ok: true,
    rotaWeekId,
    locationId: "loc-1",
    weekStart: "2026-08-03",
    inputFingerprint: "fingerprint-abc",
    proposalDigest: "digest-xyz",
    applySource: {
      kind: "headed-import",
      id: null,
      contentVersion: `rows:${operations.length}`,
      plannerRuleVersion: "build-week/1",
    },
    operations,
    preview,
  };
}

function run(events: ImportDrawerEvent[], from = initialImportDrawerState()): ImportDrawerState {
  return events.reduce(importDrawerReducer, from);
}

const HEADER = "Date,Staff,Role,Start,End,Department,Break";
const GOOD_ROW = "2026-08-03,Ana Chef,Chef,09:00,17:00,Kitchen,30";

/**
 * The rota being imported into, as the drawer sees it.
 *
 * These come from the production gate rather than being written as literals, so
 * every assertion in this file — including the ones that predate the gate — is
 * made against the availability the drawer will actually be handed.
 */
const LIVE = importScheduleAvailability({ serverBacked: true, canEdit: true });
const OFFLINE = importScheduleAvailability({ serverBacked: false, canEdit: false });
const NOT_EDITABLE = importScheduleAvailability({ serverBacked: true, canEdit: false });

describe("pasting and previewing", () => {
  it("keeps Preview disabled until something is pasted", () => {
    expect(canPreview(initialImportDrawerState(), LIVE)).toBe(false);
    expect(canPreview(run([{ type: "text-changed", text: "   \n  " }]), LIVE)).toBe(false);
    expect(canPreview(run([{ type: "text-changed", text: HEADER }]), LIVE)).toBe(true);
  });

  it("disables Preview while a request is in flight, and labels it", () => {
    const state = run([{ type: "text-changed", text: HEADER }, { type: "preview-started" }]);
    expect(canPreview(state, LIVE)).toBe(false);
    expect(previewLabel(state)).toBe("Reading…");
  });

  it("maps aliased columns through to a reviewable plan", () => {
    const result = serverResult(
      ["Day,Name,Position,From,To", "2026-08-03,Ana Chef,Chef,09:00,17:00"].join("\n"),
    );
    const state = run([
      { type: "text-changed", text: "irrelevant" },
      { type: "preview-started" },
      { type: "preview-returned", result },
    ]);
    expect(state.result?.ok).toBe(true);
    expect(previewRows(state)).toHaveLength(1);
    expect(canApply(state, LIVE)).toBe(true);
  });

  it("reads a quoted CSV field containing the delimiter", () => {
    const result = serverResult(
      [HEADER, `2026-08-03,Ana Chef,"Chef, Senior",09:00,17:00,Kitchen,30`].join("\n"),
    );
    const state = run([{ type: "preview-returned", result }]);
    expect(previewRows(state)[0]!.shift!.roleName).toBe("Chef, Senior");
  });

  it("reads a quoted TSV field containing a tab", () => {
    const result = serverResult(
      ["Date\tStaff\tRole\tStart\tEnd", `2026-08-03\tAna Chef\t"Chef\tSenior"\t09:00\t17:00`].join(
        "\n",
      ),
    );
    const state = run([{ type: "preview-returned", result }]);
    expect(state.result?.ok).toBe(true);
    expect(previewRows(state)[0]!.shift!.roleName).toBe("Chef\tSenior");
  });

  it("declaring a date order changes how the same paste is read", () => {
    const ambiguous = [HEADER, "03/08/2026,Ana Chef,Chef,09:00,17:00,Kitchen,30"].join("\n");
    const blocked = run([{ type: "preview-returned", result: serverResult(ambiguous) }]);
    expect(previewRows(blocked)[0]!.diagnostics[0]!.code).toBe("ambiguous-date");

    const declared = run([
      { type: "date-order-changed", dateOrder: "day-first" },
      { type: "preview-returned", result: serverResult(ambiguous, "day-first") },
    ]);
    expect(previewRows(declared)[0]!.shift!.signature.workDate).toBe("2026-08-03");
    expect(canApply(declared, LIVE)).toBe(true);
  });

  it("surfaces a network failure without inventing a preview", () => {
    const state = run([
      { type: "text-changed", text: HEADER },
      { type: "preview-started" },
      { type: "preview-threw" },
    ]);
    expect(state.error).toBe(PREVIEW_FAILURE_MESSAGE);
    expect(state.result).toBeNull();
    expect(canApply(state, LIVE)).toBe(false);
  });
});

describe("blocking errors and warnings", () => {
  it("blocks the confirmation when no row can be imported", () => {
    // Every row is out of the target week, so the whole preview is refused.
    const result = serverResult(
      [HEADER, "2026-09-01,Ana Chef,Chef,09:00,17:00,Kitchen,30"].join("\n"),
    );
    const state = run([{ type: "preview-returned", result }]);
    expect(state.result?.ok).toBe(false);
    expect(canApply(state, LIVE)).toBe(false);
    expect(state.error).toBeTruthy();
  });

  it("blocks the confirmation when a required column is missing", () => {
    const result = serverResult(["Date,Staff,Role", "2026-08-03,Ana Chef,Chef"].join("\n"));
    const state = run([{ type: "preview-returned", result }]);
    expect(canApply(state, LIVE)).toBe(false);
    expect(
      state.result!.preview!.diagnostics.some((d) => d.code === "missing-required-column"),
    ).toBe(true);
  });

  it("still lists a blocked row rather than dropping it", () => {
    const result = serverResult(
      [HEADER, GOOD_ROW, "2026-09-01,Ana Chef,Chef,09:00,17:00,Kitchen,30"].join("\n"),
    );
    const state = run([{ type: "preview-returned", result }]);
    const rows = previewRows(state);
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => !row.ok)).toHaveLength(1);
    expect(rows.find((row) => !row.ok)!.diagnostics.length).toBeGreaterThan(0);
  });

  it("allows a partial import, and says how many rows are blocked", () => {
    // One good row, one ambiguous staff name. The good row is still importable.
    const result = serverResult(
      [HEADER, GOOD_ROW, "2026-08-04,Ben Carter,Chef,09:00,17:00,Kitchen,30"].join("\n"),
    );
    const state = run([{ type: "preview-returned", result }]);
    expect(state.result?.ok).toBe(true);
    expect(state.result!.preview!.validCount).toBe(1);
    expect(state.result!.preview!.errorCount).toBe(1);
    expect(canApply(state, LIVE)).toBe(true);
  });

  it("warns about a duplicated row without blocking it", () => {
    const result = serverResult([HEADER, GOOD_ROW, GOOD_ROW].join("\n"));
    const state = run([{ type: "preview-returned", result }]);
    expect(state.result!.preview!.duplicatesInFile).toBe(1);
    expect(previewRows(state)[1]!.diagnostics[0]!.severity).toBe("warning");
    expect(previewRows(state)[1]!.ok).toBe(true);
    expect(canApply(state, LIVE)).toBe(true);
  });

  it("keeps the confirmation disabled when a successful preview has no operations", () => {
    const result = serverResult([HEADER, GOOD_ROW].join("\n"));
    const emptied = { ...result, operations: [] } as ImportScheduleResult;
    expect(canApply(run([{ type: "preview-returned", result: emptied }]), LIVE)).toBe(false);
  });
});

describe("applying", () => {
  const reviewed = serverResult(
    [HEADER, GOOD_ROW, "2026-08-04,,Chef,12:00,20:00,Bar,30"].join("\n"),
  );
  const previewed = run([
    { type: "text-changed", text: "pasted" },
    { type: "preview-returned", result: reviewed },
  ]);

  it("forwards the reviewed plan unchanged", () => {
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    const request = applyRequestFor(reviewed);

    // Same array instance, not a rebuilt copy: the digest is taken over exactly
    // these operations, in exactly this order.
    expect(request.operations).toBe(reviewed.operations);
    expect(request.operations).toEqual(reviewed.operations);
    // The source object is the one the database stamped. Reassembling it — for
    // instance losing contentVersion — makes the RPC recompute a different
    // fingerprint and refuse the apply as stale.
    expect(request.source).toEqual(reviewed.applySource);
    expect(request.source.contentVersion).toBe("rows:2");
    expect(request.inputFingerprint).toBe(reviewed.inputFingerprint);
    expect(request.proposalDigest).toBe(reviewed.proposalDigest);
    expect(request.rotaWeekId).toBe(reviewed.rotaWeekId);
  });

  it("disables both buttons while the apply is in flight, and labels it", () => {
    const applying = importDrawerReducer(previewed, { type: "apply-started" });
    expect(canApply(applying, LIVE)).toBe(false);
    expect(canPreview(applying, LIVE)).toBe(false);
    expect(applyLabel(applying)).toBe("Importing…");
  });

  it("keeps the reviewed preview when the import is refused", () => {
    const refused = run(
      [{ type: "apply-started" }, { type: "apply-refused", message: "This week changed." }],
      previewed,
    );
    expect(refused.error).toBe("This week changed.");
    // The whole point: the manager still has the rows and the paste in front of
    // them, and can retry without pasting again.
    expect(refused.result).toBe(previewed.result);
    expect(previewRows(refused)).toHaveLength(2);
    expect(refused.text).toBe("pasted");
    expect(canApply(refused, LIVE)).toBe(true);
  });

  it("keeps the reviewed preview when the apply call throws", () => {
    const threw = run([{ type: "apply-started" }, { type: "apply-threw" }], previewed);
    expect(threw.error).toBe(APPLY_FAILURE_MESSAGE);
    expect(threw.result).toBe(previewed.result);
    expect(threw.busy).toBe(false);
  });

  it("clears the previous error when the manager retries", () => {
    const retried = run(
      [
        { type: "apply-started" },
        { type: "apply-refused", message: "This week changed." },
        { type: "apply-started" },
      ],
      previewed,
    );
    expect(retried.error).toBeNull();
  });
});

describe("closing the drawer", () => {
  it("clears the paste and the preview, but keeps the declared date order", () => {
    const used = run([
      { type: "date-order-changed", dateOrder: "month-first" },
      { type: "text-changed", text: "pasted" },
      { type: "preview-returned", result: serverResult([HEADER, GOOD_ROW].join("\n")) },
      { type: "apply-refused", message: "refused" },
      { type: "closed" },
    ]);
    expect(used).toEqual(initialImportDrawerState("month-first"));
    expect(used.text).toBe("");
    expect(used.result).toBeNull();
    expect(used.error).toBeNull();
    expect(used.busy).toBe(false);
  });
});

describe("a rota that cannot be imported into", () => {
  const pasted = [HEADER, GOOD_ROW].join("\n");
  const ready = run([{ type: "text-changed", text: pasted }]);
  const reviewed = run([
    { type: "text-changed", text: pasted },
    { type: "preview-returned", result: serverResult(pasted) },
  ]);

  it("refuses Preview on the offline sample rota, however good the paste is", () => {
    expect(canPreview(ready, LIVE)).toBe(true);
    expect(canPreview(ready, OFFLINE)).toBe(false);
  });

  it("refuses Apply on the offline sample rota, even with a clean reviewed plan", () => {
    // The drawer makes both server calls behind these two functions, so a false
    // here is the whole guarantee: there is no reachable path to importScheduleFn
    // or applyBuildWeekProposalFn without a workspace-backed rota.
    expect(canApply(reviewed, LIVE)).toBe(true);
    expect(canApply(reviewed, OFFLINE)).toBe(false);
  });

  it("refuses both while a live week is not editable", () => {
    expect(canPreview(ready, NOT_EDITABLE)).toBe(false);
    expect(canApply(reviewed, NOT_EDITABLE)).toBe(false);
  });

  it("leaves a live editable rota deciding on the paste alone", () => {
    expect(canPreview(initialImportDrawerState(), LIVE)).toBe(false);
    expect(canPreview(ready, LIVE)).toBe(true);
    expect(canApply(ready, LIVE)).toBe(false);
    expect(canApply(reviewed, LIVE)).toBe(true);
  });
});
