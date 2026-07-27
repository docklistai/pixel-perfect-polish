import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertStaffMember } from "./insertStaffMember";
import type { StaffMemberInsert } from "../lib/addStaff";

const WORKSPACE = "11111111-1111-4111-8111-111111111111";
const STAFF_ID = "22222222-2222-4222-8222-222222222222";

function payload(overrides: Partial<StaffMemberInsert> = {}): StaffMemberInsert {
  return {
    display_name: "  Sam Rivers  ",
    email: "  Sam.Rivers@Harbourview.co.uk ",
    role_name: "  Waiter ",
    department_id: null,
    contract_type: null,
    contracted_minutes_per_week: null,
    ...overrides,
  };
}

/** Minimal stand-in exposing only the rpc call this module makes. */
function client(rpc: ReturnType<typeof vi.fn>): SupabaseClient {
  return { rpc } as unknown as SupabaseClient;
}

describe("insertStaffMember", () => {
  it("creates the membership and staff record in one transactional call", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { staff_member_id: STAFF_ID, membership_id: "33333333-3333-4333-8333-333333333333" },
      error: null,
    });

    await expect(insertStaffMember(client(rpc), WORKSPACE, payload())).resolves.toEqual({
      ok: true,
      id: STAFF_ID,
    });

    // One request, not an insert plus a second insert plus a compensating
    // delete — there is no window left in which an orphan membership can exist.
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("rpc_create_staff_member", {
      p_workspace_id: WORKSPACE,
      p_display_name: "Sam Rivers",
      p_email: "sam.rivers@harbourview.co.uk",
      p_role_name: "Waiter",
      p_department_id: null,
      p_contract_type: null,
      p_contracted_minutes_per_week: null,
    });
  });

  it("sends a null email when none was given", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { staff_member_id: STAFF_ID }, error: null });

    await insertStaffMember(client(rpc), WORKSPACE, payload({ email: null }));

    expect(rpc.mock.calls[0]![1].p_email).toBeNull();
  });

  it("preserves the duplicate-email message and issues no cleanup request", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } });

    const result = await insertStaffMember(client(rpc), WORKSPACE, payload());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/email/i);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["unknown department", "23503"],
    ["not a manager", "42501"],
    ["invalid input", "22023"],
  ])("reports a %s failure without claiming a create", async (_label, code) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code } });

    const result = await insertStaffMember(client(rpc), WORKSPACE, payload());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });

  it.each([
    ["null", null],
    ["empty object", {}],
    ["missing id", { membership_id: "33333333-3333-4333-8333-333333333333" }],
    ["non-string id", { staff_member_id: 42 }],
    ["empty id", { staff_member_id: "" }],
  ])("treats a %s payload as a failed create", async (_label, data) => {
    const rpc = vi.fn().mockResolvedValue({ data, error: null });

    const result = await insertStaffMember(client(rpc), WORKSPACE, payload());

    expect(result.ok).toBe(false);
  });
});
