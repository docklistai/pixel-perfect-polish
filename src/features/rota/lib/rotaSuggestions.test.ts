import { describe, it, expect } from "vitest";
import { fillOpenShiftsWithSuggestions } from "./rotaSuggestions";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";

function staff(id: string, name: string, role: string): StaffMember {
  return { id, name, role, hrs: "0", img: 1, tone: "info" };
}

function shift(
  id: string,
  dayIndex: RotaDayIndex,
  role: string,
  staffId: string | null,
): DraftShift {
  return {
    id,
    dayIndex,
    staffId,
    role,
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: staffId === null ? "open" : "info",
    status: staffId === null ? "open" : "scheduled",
  };
}

describe("fillOpenShiftsWithSuggestions", () => {
  it("assigns an open shift to a role-matching staff member with a reason", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef")],
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      shiftId: "s1",
      staffId: "a",
      staffName: "Ana",
      role: "Chef",
      dayIndex: 0,
    });
    expect(result.suggestions[0].reason).toBe("Role match with fewer assigned shifts this week");

    const filled = result.shifts[0];
    expect(filled.staffId).toBe("a");
    expect(filled.status).toBe("scheduled");
  });

  it("leaves an open shift open when no staff member matches the role", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Waiter")],
    );

    expect(result.suggestions).toHaveLength(0);
    expect(result.shifts[0].staffId).toBeNull();
    expect(result.shifts[0].status).toBe("open");
  });

  it("does not assign the same staff member twice on the same day", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null), shift("s2", 0, "Chef", null)],
      [staff("a", "Ana", "Chef")],
    );

    // Only one Chef available; the second open shift on the same day stays open.
    expect(result.suggestions).toHaveLength(1);
    const stillOpen = result.shifts.find((s) => s.staffId === null);
    expect(stillOpen).toBeDefined();
  });

  it("prefers the candidate with fewer shifts already assigned this week", () => {
    const result = fillOpenShiftsWithSuggestions(
      [
        shift("busy1", 0, "Chef", "a"),
        shift("busy2", 1, "Chef", "a"),
        shift("open1", 2, "Chef", null),
      ],
      [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].staffId).toBe("b");
  });

  it("never mutates already-assigned shifts", () => {
    const assigned = shift("s1", 0, "Chef", "a");
    const result = fillOpenShiftsWithSuggestions([assigned], [staff("a", "Ana", "Chef")]);

    expect(result.suggestions).toHaveLength(0);
    expect(result.shifts[0].staffId).toBe("a");
  });
});
