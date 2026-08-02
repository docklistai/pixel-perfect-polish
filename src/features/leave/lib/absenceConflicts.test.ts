import { describe, expect, it } from "vitest";
import { describeAbsenceConflicts, listConflictDays } from "./absenceConflicts";
import type { RecordedAbsence } from "../api/recordAbsence";

function absence(conflicts: RecordedAbsence["conflicting_shifts"]): RecordedAbsence {
  return {
    leave_request_id: "11111111-1111-4111-8111-111111111111",
    staff_member_id: "22222222-2222-4222-8222-222222222222",
    staff_display_name: "Priya Shah",
    leave_type: "sick",
    start_date: "2026-08-05",
    end_date: "2026-08-06",
    status: "approved",
    conflicting_shifts: conflicts,
  };
}

function shift(date: string) {
  return {
    shift_id: `shift-${date}`,
    rota_week_id: "33333333-3333-4333-8333-333333333333",
    shift_date: date,
    starts_at: `${date}T08:00:00+00:00`,
    ends_at: `${date}T16:00:00+00:00`,
    role_name: "Barista",
    assignment_status: "scheduled",
  };
}

describe("describeAbsenceConflicts", () => {
  it("returns null when the absence collides with nothing", () => {
    expect(describeAbsenceConflicts(absence([]))).toBeNull();
  });

  it("names the person, the count and says the shifts were left alone", () => {
    const message = describeAbsenceConflicts(absence([shift("2026-08-05")]));
    expect(message).toContain("Priya Shah");
    expect(message).toContain("1 rota shift");
    expect(message).toContain("left unchanged");
  });

  it("pluralises and lists each distinct day once", () => {
    const message = describeAbsenceConflicts(
      absence([shift("2026-08-05"), shift("2026-08-05"), shift("2026-08-06")]),
    );
    expect(message).toContain("3 rota shifts");
    // Three shifts, but only two distinct days.
    expect(listConflictDays([shift("2026-08-05"), shift("2026-08-05")])).not.toContain(",");
  });

  it("never claims the rota was changed or the shift removed", () => {
    const message = describeAbsenceConflicts(absence([shift("2026-08-05")]))!.toLowerCase();
    for (const claim of ["removed", "deleted", "reassigned", "cancelled", "updated the rota"]) {
      expect(message).not.toContain(claim);
    }
  });
});
