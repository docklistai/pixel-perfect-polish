import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MANAGER_ABSENCE_TYPES, MANAGER_ABSENCE_TYPE_LABELS } from "../api/recordAbsence";

const migration = readFileSync(
  "supabase/migrations/20260802090000_phase49_manager_recorded_absence.sql",
  "utf8",
);

describe("manager-recorded absence contract", () => {
  it("offers exactly the leave types the RPC accepts", () => {
    for (const type of MANAGER_ABSENCE_TYPES) {
      expect(migration).toContain(`'${type}'`);
      expect(MANAGER_ABSENCE_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("is SECURITY DEFINER with an empty search_path and manager-gated", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("public.rpc_internal_require_manager(p_workspace_id)");
  });

  it("revokes public/anon and grants only authenticated", () => {
    expect(migration).toMatch(
      /revoke all on function public\.rpc_manager_record_absence[\s\S]*?from public, anon;/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.rpc_manager_record_absence[\s\S]*?to authenticated;/,
    );
  });

  it("writes exactly one audit event", () => {
    const auditCalls = migration.match(/rpc_internal_write_audit\(/g) ?? [];
    expect(auditCalls).toHaveLength(1);
    expect(migration).toContain("'leave.manager_recorded'");
  });

  it("records the manager as decision-maker and never fakes a submission", () => {
    expect(migration).toContain("decided_by_membership_id");

    // Exactly one leave_request_events row, and it is the manager's approval —
    // a 'submitted' event would misrepresent a manager entry as a staff request.
    const eventInserts = migration.match(/insert into public\.leave_request_events/g) ?? [];
    expect(eventInserts).toHaveLength(1);

    const eventBlock = migration.slice(
      migration.indexOf("insert into public.leave_request_events"),
      migration.indexOf("-- Shifts the absence overlaps"),
    );
    expect(eventBlock).toContain("'approved'");
    expect(eventBlock).not.toContain("'submitted'");
  });

  it("refuses deterministically with 55000, never 40001", () => {
    expect(migration).toContain("errcode = '55000'");
    expect(migration).not.toContain("40001");
  });

  it("never edits or deletes a shift", () => {
    expect(migration).not.toMatch(/update public\.shifts/);
    expect(migration).not.toMatch(/delete from public\.shifts/);
  });

  it("takes the eligibility lock on the staff row", () => {
    expect(migration).toContain("from public.staff_members as staff");
    expect(migration).toContain("for update");
  });
});
