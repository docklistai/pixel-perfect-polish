import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * The shared record-absence dialog, rendered for real.
 *
 * These behaviours are only observable once mounted — the roster arriving in the
 * select, the dialog staying open after a refusal, a second submit being refused
 * while one is in flight — so they cannot live in the node test project.
 *
 * The dialog is rendered directly rather than through a route: route rendering
 * would pull in the TanStack Start / Cloudflare plugin chain that vitest.config.ts
 * deliberately avoids.
 */

const recordAbsenceFn = vi.fn();
const fetchWorkspaceStaffFn = vi.fn();
const toastSuccess = vi.fn();
const toastWarning = vi.fn();
const toastError = vi.fn();

// Mocked wholesale so the server-fn module (and @tanstack/react-start) is never
// imported in a DOM process. The real constants are covered by the node-side
// recordAbsenceContract tests.
vi.mock("../api/recordAbsence", () => ({
  recordAbsenceFn: (...args: unknown[]) => recordAbsenceFn(...args),
  MANAGER_ABSENCE_TYPES: ["sick", "annual_leave", "personal", "unpaid", "other"],
  MANAGER_ABSENCE_TYPE_LABELS: {
    sick: "Sickness",
    annual_leave: "Annual leave",
    personal: "Personal",
    unpaid: "Unpaid",
    other: "Other",
  },
}));

vi.mock("@/features/staff/api/staffLiveData", () => ({
  fetchWorkspaceStaffFn: (...args: unknown[]) => fetchWorkspaceStaffFn(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    warning: (...a: unknown[]) => toastWarning(...a),
    error: (...a: unknown[]) => toastError(...a),
    info: vi.fn(),
  },
}));

import { RecordAbsenceDialog } from "./RecordAbsenceDialog";

const WORKSPACE = "11111111-1111-4111-8111-111111111111";
const ALICE = "22222222-2222-4222-8222-222222222222";
const BOB = "33333333-3333-4333-8333-333333333333";

const ROSTER = [
  { id: ALICE, name: "Alice Cook", active: true },
  { id: BOB, name: "Bob Porter", active: true },
  { id: "44444444-4444-4444-8444-444444444444", name: "Ivan Left", active: false },
];

function absence(overrides: Record<string, unknown> = {}) {
  return {
    leave_request_id: "99999999-9999-4999-8999-999999999999",
    staff_member_id: ALICE,
    staff_display_name: "Alice Cook",
    leave_type: "sick",
    start_date: "2026-08-05",
    end_date: "2026-08-05",
    status: "approved",
    conflicting_shifts: [],
    ...overrides,
  };
}

function renderDialog(props: Partial<React.ComponentProps<typeof RecordAbsenceDialog>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = vi.fn();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RecordAbsenceDialog open onOpenChange={onOpenChange} workspaceId={WORKSPACE} {...props} />
    </QueryClientProvider>,
  );

  return { ...utils, onOpenChange, invalidateSpy, queryClient };
}

/** Fills the two fields the dialog cannot preselect for you. */
async function completeForm(user: ReturnType<typeof userEvent.setup>, staffName: string) {
  const staffSelect = await screen.findByRole("combobox", { name: /staff member/i });
  await waitFor(() => {
    expect(within(staffSelect).getByRole("option", { name: staffName })).toBeInTheDocument();
  });
  await user.selectOptions(staffSelect, screen.getByRole("option", { name: staffName }));
  await user.type(screen.getByRole("textbox", { name: /reason/i }), "Phoned in with flu");
}

describe("RecordAbsenceDialog", () => {
  beforeEach(() => {
    fetchWorkspaceStaffFn.mockResolvedValue(ROSTER);
    recordAbsenceFn.mockResolvedValue({ ok: true, absence: absence() });
  });

  it("loads the workspace roster into the staff select, active staff only", async () => {
    renderDialog();

    const staffSelect = await screen.findByRole("combobox", { name: /staff member/i });
    await waitFor(() => {
      expect(within(staffSelect).getByRole("option", { name: "Alice Cook" })).toBeInTheDocument();
    });

    expect(within(staffSelect).getByRole("option", { name: "Bob Porter" })).toBeInTheDocument();
    // Inactive staff must never be offered — the RPC would refuse them anyway.
    expect(within(staffSelect).queryByRole("option", { name: "Ivan Left" })).toBeNull();
  });

  it("submits the selected staff, type and dates to the one shared mutation", async () => {
    const user = userEvent.setup();
    renderDialog({ defaultStartDate: "2026-08-05" });

    await completeForm(user, "Bob Porter");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /type/i }),
      screen.getByRole("option", { name: "Annual leave" }),
    );
    await user.click(screen.getByRole("button", { name: /record absence/i }));

    await waitFor(() => expect(recordAbsenceFn).toHaveBeenCalledTimes(1));
    expect(recordAbsenceFn).toHaveBeenCalledWith({
      data: {
        workspaceId: WORKSPACE,
        staffMemberId: BOB,
        leaveType: "annual_leave",
        startDate: "2026-08-05",
        endDate: "2026-08-05",
        reason: "Phoned in with flu",
      },
    });
  });

  it("preselects the staff member handed in from a profile or rota cell", async () => {
    renderDialog({ defaultStaffMemberId: BOB, defaultStartDate: "2026-08-07" });

    const staffSelect = await screen.findByRole("combobox", { name: /staff member/i });
    await waitFor(() => expect((staffSelect as HTMLSelectElement).value).toBe(BOB));

    // The rota cell's day becomes both ends of a single-day absence.
    expect(screen.getByLabelText(/first day/i)).toHaveValue("2026-08-07");
    expect(screen.getByLabelText(/last day/i)).toHaveValue("2026-08-07");
    // Rota inline entry is a sickness command, and sick is the dialog's default.
    expect(screen.getByRole("combobox", { name: /type/i })).toHaveValue("sick");
  });

  it("closes and invalidates the intended queries on a clean result", async () => {
    const user = userEvent.setup();
    const { onOpenChange, invalidateSpy } = renderDialog();

    await completeForm(user, "Alice Cook");
    await user.click(screen.getByRole("button", { name: /record absence/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toastSuccess).toHaveBeenCalled();

    const invalidatedKeys = invalidateSpy.mock.calls.map(([arg]) =>
      JSON.stringify((arg as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys.some((k) => k.includes("leave"))).toBe(true);
    expect(invalidatedKeys.some((k) => k.includes("manager-notifications"))).toBe(true);
    expect(invalidatedKeys.some((k) => k.includes("workspace-week"))).toBe(true);
    expect(invalidatedKeys.some((k) => k.includes("profile-rota"))).toBe(true);
  });

  it("warns that conflicting shifts were preserved, naming the days", async () => {
    const user = userEvent.setup();
    recordAbsenceFn.mockResolvedValue({
      ok: true,
      absence: absence({
        conflicting_shifts: [
          {
            shift_id: "s1",
            rota_week_id: "w1",
            shift_date: "2026-08-05",
            starts_at: "2026-08-05T09:00:00Z",
            ends_at: "2026-08-05T17:00:00Z",
            role_name: "Chef",
            assignment_status: "scheduled",
          },
        ],
      }),
    });
    renderDialog();

    await completeForm(user, "Alice Cook");
    await user.click(screen.getByRole("button", { name: /record absence/i }));

    await waitFor(() => expect(toastWarning).toHaveBeenCalled());
    const [title, options] = toastWarning.mock.calls[0] as [string, { description: string }];
    expect(title).toMatch(/rota needs review/i);
    // The manager must be told the shift still stands, not that it was handled.
    expect(options.description).toMatch(/left unchanged/i);
    expect(options.description).toMatch(/Alice Cook/);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and shows a safe error when the RPC refuses", async () => {
    const user = userEvent.setup();
    recordAbsenceFn.mockResolvedValue({
      ok: false,
      message: "You don't have manager access to record an absence.",
    });
    const { onOpenChange } = renderDialog();

    await completeForm(user, "Alice Cook");
    await user.click(screen.getByRole("button", { name: /record absence/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    const [, options] = toastError.mock.calls[0] as [string, { description: string }];
    expect(options.description).toBe("You don't have manager access to record an absence.");

    // The manager keeps their typed input and can correct it.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: /record absence/i })).toBeInTheDocument();
  });

  it("cannot fire a second submission while one is pending", async () => {
    const user = userEvent.setup();
    let release: (v: unknown) => void = () => {};
    recordAbsenceFn.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    renderDialog();

    await completeForm(user, "Alice Cook");
    const submitButton = screen.getByRole("button", { name: /record absence/i });
    await user.click(submitButton);

    await waitFor(() => expect(recordAbsenceFn).toHaveBeenCalledTimes(1));
    // Button reflects the in-flight state and further clicks are inert.
    await waitFor(() => expect(screen.getByRole("button", { name: /recording/i })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: /recording/i }));
    await user.click(screen.getByRole("button", { name: /recording/i }));

    expect(recordAbsenceFn).toHaveBeenCalledTimes(1);
    release({ ok: true, absence: absence() });
  });

  it("does not submit without a staff member or a reason", async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByRole("combobox", { name: /staff member/i });
    await user.click(screen.getByRole("button", { name: /record absence/i }));

    expect(recordAbsenceFn).not.toHaveBeenCalled();
  });

  it("does not read the roster until it is actually opened", async () => {
    renderDialog({ open: false });
    await waitFor(() => expect(fetchWorkspaceStaffFn).not.toHaveBeenCalled());
  });
});
