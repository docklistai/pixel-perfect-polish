import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calculateLeaveBalance } from "../lib/leaveBalance";
import { resolveLeaveYear } from "../lib/leaveYear";
import {
  ENTITLEMENT_COLUMNS,
  STAFF_COLUMNS,
  managerContext,
  readLeaveYearRequests,
  readPolicy,
  toBalanceRequests,
  toContext,
  todayIso,
  type LeaveBalancesResult,
  type RequestRow,
  type StaffLeaveBalanceResult,
  type StaffRow,
} from "./leaveEntitlementModel";

export type {
  LeaveYearContext,
  StaffLeaveBalance,
  LeaveBalancesResult,
  StaffLeaveBalanceResult,
} from "./leaveEntitlementModel";

/**
 * Manager-side leave entitlement server functions: team balances, one staff
 * member's balance, and recording an entitlement. Shared types and query
 * helpers live in `leaveEntitlementModel.ts`.
 */

const workspaceInput = z.object({ workspaceId: z.string().uuid() });
const staffInput = workspaceInput.extend({ staffMemberId: z.string().uuid() });

/**
 * Team balances for the Leave page, for the leave year containing today.
 *
 * Four bounded queries and an in-memory join — never one query per staff
 * member. Staff with no recorded entitlement are still returned so the card can
 * show them honestly as "not recorded" rather than omitting them.
 */
export const fetchLeaveTeamBalancesFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data }): Promise<LeaveBalancesResult> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const policy = await readPolicy(supabase, workspaceId);
    const window = resolveLeaveYear(todayIso(), policy.startMonth);

    if (!window) {
      return {
        configured: false,
        leaveYear: null,
        defaultAnnualLeaveDays: policy.defaultDays,
        balances: [],
      };
    }

    const [staffResult, entitlementResult, requestRows] = await Promise.all([
      supabase
        .from("staff_members")
        .select(STAFF_COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("employment_status", "active")
        .order("display_name", { ascending: true }),
      supabase
        .from("staff_leave_entitlements")
        .select(ENTITLEMENT_COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("leave_year_start", window.startIso),
      readLeaveYearRequests(supabase, workspaceId, window),
    ]);

    if (staffResult.error) throw staffResult.error;
    if (entitlementResult.error) throw entitlementResult.error;

    const entitlementByStaff = new Map<string, number>();
    for (const row of (entitlementResult.data as
      | { staff_member_id: string; entitlement_days: number }[]
      | null) ?? []) {
      entitlementByStaff.set(row.staff_member_id, row.entitlement_days);
    }

    const requestsByStaff = new Map<string, RequestRow[]>();
    for (const row of requestRows) {
      const bucket = requestsByStaff.get(row.staff_member_id);
      if (bucket) bucket.push(row);
      else requestsByStaff.set(row.staff_member_id, [row]);
    }

    const balances = ((staffResult.data as StaffRow[] | null) ?? []).map((staff) => ({
      staffMemberId: staff.id,
      displayName: staff.display_name,
      roleName: staff.role_name,
      ...calculateLeaveBalance({
        entitlementDays: entitlementByStaff.get(staff.id) ?? null,
        requests: toBalanceRequests(requestsByStaff.get(staff.id) ?? []),
        window,
      }),
    }));

    return {
      configured: true,
      leaveYear: toContext(window),
      defaultAnnualLeaveDays: policy.defaultDays,
      balances,
    };
  });

/**
 * One staff member's balance for the leave year containing today. Powers the
 * staff-profile entitlement card and the approval-dialog balance context.
 */
export const fetchStaffLeaveBalanceFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => staffInput.parse(input))
  .handler(async ({ data }): Promise<StaffLeaveBalanceResult> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const policy = await readPolicy(supabase, workspaceId);
    const window = resolveLeaveYear(todayIso(), policy.startMonth);

    if (!window) {
      return {
        configured: false,
        leaveYear: null,
        defaultAnnualLeaveDays: policy.defaultDays,
        balance: null,
      };
    }

    const [staffResult, entitlementResult, requestRows] = await Promise.all([
      supabase
        .from("staff_members")
        .select(STAFF_COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("id", data.staffMemberId)
        .maybeSingle(),
      supabase
        .from("staff_leave_entitlements")
        .select(ENTITLEMENT_COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("staff_member_id", data.staffMemberId)
        .eq("leave_year_start", window.startIso)
        .maybeSingle(),
      readLeaveYearRequests(supabase, workspaceId, window, data.staffMemberId),
    ]);

    if (staffResult.error) throw staffResult.error;
    if (entitlementResult.error) throw entitlementResult.error;

    const staff = staffResult.data as StaffRow | null;
    if (!staff) {
      return {
        configured: true,
        leaveYear: toContext(window),
        defaultAnnualLeaveDays: policy.defaultDays,
        balance: null,
      };
    }

    const entitlement = entitlementResult.data as { entitlement_days: number } | null;

    return {
      configured: true,
      leaveYear: toContext(window),
      defaultAnnualLeaveDays: policy.defaultDays,
      balance: {
        staffMemberId: staff.id,
        displayName: staff.display_name,
        roleName: staff.role_name,
        ...calculateLeaveBalance({
          entitlementDays: entitlement ? entitlement.entitlement_days : null,
          requests: toBalanceRequests(requestRows),
          window,
        }),
      },
    };
  });

const saveEntitlementInput = staffInput.extend({
  /** The leave year this entitlement belongs to, as its resolved first day. */
  leaveYearStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entitlementDays: z.number().int().min(0).max(366),
});

export type SaveStaffEntitlementInput = z.infer<typeof saveEntitlementInput>;

/**
 * Record one staff member's entitlement for one leave year.
 *
 * Conflicts on (workspace_id, staff_member_id, leave_year_start) and only ever
 * changes `entitlement_days`, so saving a later year cannot touch an earlier
 * one. `leave_year_start` is immutable at the database level as well, so even a
 * malformed update cannot move a recorded entitlement between years.
 */
export const saveStaffEntitlementFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveEntitlementInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);

    // Provenance for the recorded figure: which manager membership stated it.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let setByMembershipId: string | null = null;
    if (user) {
      const { data: membership, error: membershipError } = await supabase
        .from("workspace_memberships")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (membershipError) throw membershipError;
      setByMembershipId = (membership as { id: string } | null)?.id ?? null;
    }

    const { error } = await supabase.from("staff_leave_entitlements").upsert(
      {
        workspace_id: workspaceId,
        staff_member_id: data.staffMemberId,
        leave_year_start: data.leaveYearStart,
        entitlement_days: data.entitlementDays,
        set_by_membership_id: setByMembershipId,
      },
      { onConflict: "workspace_id,staff_member_id,leave_year_start" },
    );
    if (error) throw error;
    return { ok: true };
  });
