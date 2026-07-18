import { describe, expect, it } from "vitest";
import { exportInput } from "./timeLiveSchemas";

describe("exportInput", () => {
  it("accepts an optional department scope without accepting a client workspace", () => {
    expect(
      exportInput.parse({
        startDate: "2026-07-13",
        endDate: "2026-07-19",
        departmentId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      startDate: "2026-07-13",
      endDate: "2026-07-19",
      departmentId: "11111111-1111-4111-8111-111111111111",
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
