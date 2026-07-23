import { describe, expect, it } from "vitest";
import {
  buildRetryPlan,
  describeRotaBulkOutcome,
  runRotaBulkPlan,
  type RotaBulkRunners,
} from "./runRotaBulkPlan";
import { buildBulkPlan, type RotaBulkCellPlan } from "./rotaBulkPlan";

function cell(row: string, ops: RotaBulkCellPlan["ops"]): RotaBulkCellPlan {
  return { key: { row, day: 0 }, label: `${row} d0`, ops, warnings: [] };
}

function planOf(cells: RotaBulkCellPlan[], signature = "sig") {
  const plan = buildBulkPlan("paste", cells, [], [], []);
  return { ...plan, signature };
}

function recordingRunners(overrides: Partial<RotaBulkRunners> = {}) {
  const calls: string[] = [];
  const runners: RotaBulkRunners = {
    addShift: async (input) => {
      calls.push(`add:${input.role}`);
    },
    updateShift: async (id) => {
      calls.push(`update:${id}`);
    },
    removeShift: async (id) => {
      calls.push(`remove:${id}`);
    },
    refetch: async () => {
      calls.push("refetch");
    },
    ...overrides,
  };
  return { runners, calls };
}

const create = {
  kind: "create" as const,
  input: { dayIndex: 0 as const, staffId: null, role: "Bar", start: "09:00", end: "17:00" },
};

describe("runRotaBulkPlan", () => {
  it("applies operations strictly sequentially", async () => {
    const { runners, calls } = recordingRunners();
    const plan = planOf([
      cell("a", [{ kind: "remove", shiftId: "s1" }]),
      cell("b", [{ kind: "remove", shiftId: "s2" }]),
    ]);
    const outcome = await runRotaBulkPlan(plan, runners);
    expect(calls).toEqual(["refetch", "remove:s1", "remove:s2", "refetch"]);
    expect(outcome.appliedCells).toBe(2);
    expect(outcome.failedCells).toBe(0);
  });

  it("refetches before and after the run", async () => {
    const { runners, calls } = recordingRunners();
    await runRotaBulkPlan(planOf([cell("a", [{ kind: "remove", shiftId: "s1" }])]), runners);
    expect(calls[0]).toBe("refetch");
    expect(calls[calls.length - 1]).toBe("refetch");
  });

  it("aborts before any write when the signature drifted", async () => {
    const { runners, calls } = recordingRunners();
    const outcome = await runRotaBulkPlan(planOf([cell("a", [create])], "before"), runners, {
      currentSignature: () => "after",
    });
    expect(outcome.aborted).toBeTruthy();
    expect(calls).toEqual(["refetch"]); // the pre-write refetch only, no writes
    expect(outcome.appliedCells).toBe(0);
  });

  it("proceeds when the signature is unchanged", async () => {
    const { runners } = recordingRunners();
    const outcome = await runRotaBulkPlan(planOf([cell("a", [create])], "same"), runners, {
      currentSignature: () => "same",
    });
    expect(outcome.aborted).toBeUndefined();
    expect(outcome.appliedCells).toBe(1);
  });

  it("stops at the first failure and reports the rest as not attempted", async () => {
    let n = 0;
    const { runners } = recordingRunners({
      removeShift: async () => {
        n += 1;
        if (n === 2) throw new Error("server rejected the write");
      },
    });
    const plan = planOf([
      cell("a", [{ kind: "remove", shiftId: "s1" }]),
      cell("b", [{ kind: "remove", shiftId: "s2" }]),
      cell("c", [{ kind: "remove", shiftId: "s3" }]),
    ]);
    const outcome = await runRotaBulkPlan(plan, runners);
    expect(outcome.appliedCells).toBe(1);
    expect(outcome.failedCells).toBe(1);
    expect(outcome.notAttemptedCells).toBe(1);
    expect(outcome.outcomes.map((o) => o.status)).toEqual(["applied", "failed", "not-attempted"]);
    expect(outcome.outcomes[1]!.error).toMatch(/server rejected/i);
  });

  it("preserves applied results when the final refetch fails", async () => {
    let refetches = 0;
    const { runners } = recordingRunners({
      refetch: async () => {
        refetches += 1;
        if (refetches === 2) throw new Error("network unavailable");
      },
    });
    const outcome = await runRotaBulkPlan(
      planOf([cell("a", [{ kind: "remove", shiftId: "s1" }])]),
      runners,
    );
    expect(outcome.outcomes[0]?.status).toBe("applied");
    expect(outcome.appliedCells).toBe(1);
    expect(outcome.refreshError).toMatch(/network unavailable/i);
  });

  it("clears single-operation history after a same-count replacement", async () => {
    let resets = 0;
    const { runners } = recordingRunners({
      onApplied: () => {
        resets += 1;
      },
    });
    await runRotaBulkPlan(
      planOf([cell("a", [{ kind: "remove", shiftId: "s1" }, create])]),
      runners,
    );
    expect(resets).toBe(1);
  });

  it("clears history after bulk clear and partial success", async () => {
    let resets = 0;
    let removes = 0;
    const { runners } = recordingRunners({
      removeShift: async () => {
        removes += 1;
        if (removes === 2) throw new Error("stop");
      },
      onApplied: () => {
        resets += 1;
      },
    });
    await runRotaBulkPlan(
      planOf([
        cell("a", [{ kind: "remove", shiftId: "s1" }]),
        cell("b", [{ kind: "remove", shiftId: "s2" }]),
      ]),
      runners,
    );
    expect(resets).toBe(1);
  });

  it("does not clear history when drift aborts before any write", async () => {
    let resets = 0;
    const { runners } = recordingRunners({
      onApplied: () => {
        resets += 1;
      },
    });
    await runRotaBulkPlan(planOf([cell("a", [create])], "before"), runners, {
      currentSignature: () => "after",
    });
    expect(resets).toBe(0);
  });

  it("never claims atomicity or rollback in its summary", () => {
    const text = describeRotaBulkOutcome({
      outcomes: [],
      appliedCells: 9,
      failedCells: 1,
      notAttemptedCells: 2,
      totalCells: 12,
    });
    expect(text).toBe("9 of 12 cells updated. 3 were not applied.");
    expect(text).not.toMatch(/undo|rollback|atomic|restored/i);
  });

  it.each([
    [
      { appliedCells: 1, failedCells: 0, notAttemptedCells: 0, totalCells: 1 },
      "1 of 1 cell updated.",
    ],
    [
      { appliedCells: 0, failedCells: 1, notAttemptedCells: 0, totalCells: 1 },
      "0 of 1 cell updated. 1 was not applied.",
    ],
    [
      { appliedCells: 1, failedCells: 1, notAttemptedCells: 1, totalCells: 3 },
      "1 of 3 cells updated. 2 were not applied.",
    ],
  ])("uses truthful singular/plural grammar", (counts, expected) => {
    expect(describeRotaBulkOutcome({ outcomes: [], ...counts })).toBe(expected);
  });
});

describe("buildRetryPlan", () => {
  it("retries only the failed and not-attempted cells", () => {
    const plan = planOf([
      cell("a", [{ kind: "remove", shiftId: "s1" }]),
      cell("b", [{ kind: "remove", shiftId: "s2" }]),
      cell("c", [{ kind: "remove", shiftId: "s3" }]),
    ]);
    const outcome = {
      outcomes: [
        { key: { row: "a", day: 0 }, label: "a", status: "applied" as const, completedOps: 1 },
        { key: { row: "b", day: 0 }, label: "b", status: "failed" as const, completedOps: 0 },
        {
          key: { row: "c", day: 0 },
          label: "c",
          status: "not-attempted" as const,
          completedOps: 0,
        },
      ],
      appliedCells: 1,
      failedCells: 1,
      notAttemptedCells: 1,
      totalCells: 3,
    };
    const retry = buildRetryPlan(plan, outcome, "fresh-sig");
    expect(retry.cells.map((c) => c.key.row)).toEqual(["b", "c"]);
    expect(retry.signature).toBe("fresh-sig");
  });

  it("resumes a partially-applied split cell rather than restarting it", () => {
    const plan = planOf([
      cell("a", [
        { kind: "remove", shiftId: "s1" },
        { kind: "remove", shiftId: "s2" },
      ]),
    ]);
    const outcome = {
      outcomes: [
        { key: { row: "a", day: 0 }, label: "a", status: "failed" as const, completedOps: 1 },
      ],
      appliedCells: 0,
      failedCells: 1,
      notAttemptedCells: 0,
      totalCells: 1,
    };
    const retry = buildRetryPlan(plan, outcome, "sig");
    // The first op already landed; only the second is retried.
    expect(retry.cells[0]!.ops).toEqual([{ kind: "remove", shiftId: "s2" }]);
  });
});
