import { describe, expect, it } from "vitest";
import {
  approveInput,
  exportInput,
  flagTimeEntryInput,
  hoursQueriesInput,
  resolveHoursQueryInput,
  staffHoursQueryInput,
  unflagTimeEntryInput,
} from "./timeLiveSchemas";

const validUuid1 = "11111111-1111-4111-8111-111111111111";
const validUuid2 = "22222222-2222-4222-8222-222222222222";

describe("exportInput", () => {
  it("accepts an optional department scope without accepting a client workspace", () => {
    expect(
      exportInput.parse({
        startDate: "2026-07-13",
        endDate: "2026-07-19",
        departmentId: validUuid1,
      }),
    ).toEqual({
      startDate: "2026-07-13",
      endDate: "2026-07-19",
      departmentId: validUuid1,
    });
  });

  it("rejects invalid department identifiers and reversed ranges", () => {
    expect(
      exportInput.safeParse({
        startDate: "2026-07-13",
        endDate: "2026-07-19",
        departmentId: "another-workspace",
      }).success,
    ).toBe(false);
    expect(exportInput.safeParse({ startDate: "2026-07-20", endDate: "2026-07-19" }).success).toBe(
      false,
    );
  });
});

describe("approveInput", () => {
  it("allows approval without a reason", () => {
    const result = approveInput.safeParse({
      workspaceId: validUuid1,
      timeEntryIds: [validUuid2],
      approvalStatus: "approved",
    });
    expect(result.success).toBe(true);
  });

  it("allows pending status without a reason", () => {
    const result = approveInput.safeParse({
      workspaceId: validUuid1,
      timeEntryIds: [validUuid2],
      approvalStatus: "pending",
    });
    expect(result.success).toBe(true);
  });

  it("requires a non-empty reason when returning for correction (rejected)", () => {
    const withoutReason = approveInput.safeParse({
      workspaceId: validUuid1,
      timeEntryIds: [validUuid2],
      approvalStatus: "rejected",
    });
    expect(withoutReason.success).toBe(false);

    const emptyReason = approveInput.safeParse({
      workspaceId: validUuid1,
      timeEntryIds: [validUuid2],
      approvalStatus: "rejected",
      reason: "   ",
    });
    expect(emptyReason.success).toBe(false);

    const validRejection = approveInput.safeParse({
      workspaceId: validUuid1,
      timeEntryIds: [validUuid2],
      approvalStatus: "rejected",
      reason: "Missing 30m break on shift",
    });
    expect(validRejection.success).toBe(true);
  });
});

describe("flagTimeEntryInput & unflagTimeEntryInput", () => {
  it("enforces note when flagging an entry", () => {
    expect(
      flagTimeEntryInput.safeParse({
        workspaceId: validUuid1,
        timeEntryId: validUuid2,
        note: "",
      }).success,
    ).toBe(false);

    expect(
      flagTimeEntryInput.safeParse({
        workspaceId: validUuid1,
        timeEntryId: validUuid2,
        note: "Needs supervisor check on overtime",
      }).success,
    ).toBe(true);
  });

  it("accepts valid unflag payload", () => {
    expect(
      unflagTimeEntryInput.safeParse({
        workspaceId: validUuid1,
        timeEntryId: validUuid2,
      }).success,
    ).toBe(true);
  });
});

describe("hoursQueriesInput & resolveHoursQueryInput", () => {
  it("accepts valid query list input", () => {
    expect(hoursQueriesInput.safeParse({ workspaceId: validUuid1 }).success).toBe(true);
    expect(
      hoursQueriesInput.safeParse({ workspaceId: validUuid1, status: "pending" }).success,
    ).toBe(true);
    expect(
      hoursQueriesInput.safeParse({
        workspaceId: validUuid1,
        status: "invalid" as unknown as "pending",
      }).success,
    ).toBe(false);
  });

  it("validates resolution input", () => {
    expect(
      resolveHoursQueryInput.safeParse({
        workspaceId: validUuid1,
        queryId: validUuid2,
        status: "resolved",
        resolutionNote: "Adjusted clock-out time",
      }).success,
    ).toBe(true);

    expect(
      resolveHoursQueryInput.safeParse({
        workspaceId: validUuid1,
        queryId: validUuid2,
        status: "dismissed",
      }).success,
    ).toBe(true);

    expect(
      resolveHoursQueryInput.safeParse({
        workspaceId: validUuid1,
        queryId: validUuid2,
        status: "pending" as unknown as "resolved",
      }).success,
    ).toBe(false);
  });
});

describe("staffHoursQueryInput", () => {
  it("enforces valid issue type and non-empty note", () => {
    expect(
      staffHoursQueryInput.safeParse({
        workspaceId: validUuid1,
        timeEntryId: validUuid2,
        issueType: "missing_clock_out",
        note: "Left at 22:30, forgot to clock out",
      }).success,
    ).toBe(true);

    expect(
      staffHoursQueryInput.safeParse({
        workspaceId: validUuid1,
        timeEntryId: validUuid2,
        issueType: "invalid_issue" as unknown as "missing_clock_out",
        note: "Something happened",
      }).success,
    ).toBe(false);

    expect(
      staffHoursQueryInput.safeParse({
        workspaceId: validUuid1,
        timeEntryId: validUuid2,
        issueType: "incorrect_times",
        note: "   ",
      }).success,
    ).toBe(false);
  });
});
