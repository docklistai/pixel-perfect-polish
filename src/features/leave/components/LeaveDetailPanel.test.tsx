import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaveDetailPanel } from "./LeaveDetailPanel";
import type { LeaveRequest } from "../types";
import type { StaffEntitlementView } from "../hooks/useStaffEntitlement";

const mockUseStaffEntitlement = vi.fn();

vi.mock("../hooks/useStaffEntitlement", () => ({
  useStaffEntitlement: (staffId: string | null) => mockUseStaffEntitlement(staffId),
}));

const sampleRequest: LeaveRequest = {
  id: "req-1",
  staffId: "staff-1",
  n: "Sarah Connor",
  role: "Shift Leader",
  dept: "Front of House",
  date: "12 Jul – 14 Jul",
  startIso: "2026-07-12",
  endIso: "2026-07-14",
  days: 3,
  type: "Annual leave",
  typeKey: "annual_leave",
  impact: "Medium",
  tone: "warning",
  state: "pending",
  notice: 14,
  reason: "Family event",
  img: 1,
  balance: "18 / 28 days",
  submitted: "28 Jun",
  coverNote: "",
};

const otherRequest: LeaveRequest = {
  id: "req-2",
  staffId: "staff-2",
  n: "John Reese",
  role: "Security",
  dept: "Operations",
  date: "13 Jul – 15 Jul",
  startIso: "2026-07-13",
  endIso: "2026-07-15",
  days: 3,
  type: "Annual leave",
  typeKey: "annual_leave",
  impact: "Medium",
  tone: "warning",
  state: "approved",
  notice: 20,
  reason: "Vacation",
  img: 2,
  balance: "15 / 28 days",
  submitted: "20 Jun",
  coverNote: "",
};

describe("LeaveDetailPanel", () => {
  const onApprove = vi.fn();
  const onDecline = vi.fn();
  const onCancel = vi.fn();
  const onReopen = vi.fn();
  const onOpenRisk = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStaffEntitlement.mockReturnValue({
      enabled: false,
      isLoading: false,
      isError: false,
      result: null,
      isSaving: false,
      save: vi.fn(),
    } satisfies StaffEntitlementView);
  });

  it("renders demo decision context with demo balance after", () => {
    render(
      <LeaveDetailPanel
        request={sampleRequest}
        requests={[sampleRequest, otherRequest]}
        source="demo"
        onApprove={onApprove}
        onDecline={onDecline}
        onCancel={onCancel}
        onReopen={onReopen}
        onOpenRisk={onOpenRisk}
      />,
    );

    expect(screen.getByText("Decision context")).toBeInTheDocument();
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("3 calendar days")).toBeInTheDocument();
    expect(screen.getByText("18 / 28 days")).toBeInTheDocument();
    expect(screen.getByText("Other requests in this period")).toBeInTheDocument();
    expect(screen.getByText("John Reese")).toBeInTheDocument();
    expect(screen.getByText(/Security/)).toBeInTheDocument();
  });

  it("renders real entitlement before and after in live mode when recorded", () => {
    mockUseStaffEntitlement.mockReturnValue({
      enabled: true,
      isLoading: false,
      isError: false,
      result: {
        configured: true,
        leaveYear: { startIso: "2026-01-01", endIso: "2026-12-31", label: "2026" },
        defaultAnnualLeaveDays: 28,
        balance: {
          staffMemberId: "staff-1",
          displayName: "Sarah Connor",
          roleName: "Shift Leader",
          recorded: true,
          entitlementDays: 28,
          booked: 10,
          pending: 3,
          remaining: 18,
        },
      },
      isSaving: false,
      save: vi.fn(),
    });

    render(
      <LeaveDetailPanel
        request={sampleRequest}
        requests={[sampleRequest]}
        source="live"
        onApprove={onApprove}
        onDecline={onDecline}
        onCancel={onCancel}
        onReopen={onReopen}
        onOpenRisk={onOpenRisk}
      />,
    );

    expect(screen.getByText("Remaining before")).toBeInTheDocument();
    expect(screen.getByText("18 of 28 days")).toBeInTheDocument();
    expect(screen.getByText("Remaining after")).toBeInTheDocument();
    expect(screen.getByText("15 of 28 days")).toBeInTheDocument();
  });

  it("renders Entitlement not recorded in live mode when entitlement is missing", () => {
    mockUseStaffEntitlement.mockReturnValue({
      enabled: true,
      isLoading: false,
      isError: false,
      result: {
        configured: true,
        leaveYear: { startIso: "2026-01-01", endIso: "2026-12-31", label: "2026" },
        defaultAnnualLeaveDays: null,
        balance: {
          staffMemberId: "staff-1",
          displayName: "Sarah Connor",
          roleName: "Shift Leader",
          recorded: false,
          entitlementDays: null,
          booked: 0,
          pending: 3,
          remaining: null,
        },
      },
      isSaving: false,
      save: vi.fn(),
    });

    render(
      <LeaveDetailPanel
        request={sampleRequest}
        requests={[sampleRequest]}
        source="live"
        onApprove={onApprove}
        onDecline={onDecline}
        onCancel={onCancel}
        onReopen={onReopen}
        onOpenRisk={onOpenRisk}
      />,
    );

    expect(screen.getByText("Entitlement not recorded")).toBeInTheDocument();
  });

  it("shows non-annual leave is not affected by annual entitlement", () => {
    const sickRequest: LeaveRequest = {
      ...sampleRequest,
      type: "Sickness",
      typeKey: "sick",
    };

    render(
      <LeaveDetailPanel
        request={sickRequest}
        requests={[sickRequest]}
        source="live"
        onApprove={onApprove}
        onDecline={onDecline}
        onCancel={onCancel}
        onReopen={onReopen}
        onOpenRisk={onOpenRisk}
      />,
    );

    expect(screen.getByText("Not affected by this leave type")).toBeInTheDocument();
  });

  it("calls onApprove and onDecline actions", async () => {
    const user = userEvent.setup();
    render(
      <LeaveDetailPanel
        request={sampleRequest}
        requests={[sampleRequest]}
        source="demo"
        onApprove={onApprove}
        onDecline={onDecline}
        onCancel={onCancel}
        onReopen={onReopen}
        onOpenRisk={onOpenRisk}
      />,
    );

    await user.click(screen.getByRole("button", { name: /approve/i }));
    expect(onApprove).toHaveBeenCalledWith(sampleRequest);

    await user.click(screen.getByRole("button", { name: /decline/i }));
    expect(onDecline).toHaveBeenCalledWith(sampleRequest);
  });
});
