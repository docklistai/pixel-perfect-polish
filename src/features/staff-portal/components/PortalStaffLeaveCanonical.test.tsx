import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalLeaveBalanceCard } from "./PortalLeaveBalanceCard";
import { PortalLeaveHistory } from "./PortalLeaveHistory";
import { ShiftRequestsList } from "./ShiftRequestsList";
import * as usePortalLeaveBalanceModule from "../hooks/usePortalLeaveBalance";
import * as usePortalOpenShiftsModule from "../hooks/usePortalOpenShifts";
import * as usePortalShiftReleasesModule from "../hooks/usePortalShiftReleases";
import { NOT_RECORDED_LABEL } from "@/features/leave/lib/leaveBalancePresentation";
import type { PortalLeaveRequest } from "../api/portalLiveData";

describe("WS-14b — Staff Leave Canonical Home (§8.6)", () => {
  describe("PortalLeaveBalanceCard", () => {
    it("renders Entitlement, Approved, Pending, and Remaining labels with pending distinct from approved", () => {
      vi.spyOn(usePortalLeaveBalanceModule, "usePortalLeaveBalance").mockReturnValue({
        enabled: true,
        isLoading: false,
        isError: false,
        balance: {
          recorded: true,
          entitlementDays: 28,
          booked: 10,
          pending: 3,
          remaining: 18,
        },
        leaveYearLabel: "1 Jan – 31 Dec 2026",
      });

      render(<PortalLeaveBalanceCard />);

      // Four canonical column labels
      expect(screen.getByText("Entitlement")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Remaining")).toBeInTheDocument();

      // Values: approved is 10, pending is 3 (pending is never summed into approved)
      expect(screen.getByText("28")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("18")).toBeInTheDocument();
    });

    it("renders negative remaining rather than clamping to zero", () => {
      vi.spyOn(usePortalLeaveBalanceModule, "usePortalLeaveBalance").mockReturnValue({
        enabled: true,
        isLoading: false,
        isError: false,
        balance: {
          recorded: true,
          entitlementDays: 15,
          booked: 18,
          pending: 0,
          remaining: -3,
        },
        leaveYearLabel: "1 Jan – 31 Dec 2026",
      });

      render(<PortalLeaveBalanceCard />);

      // Negative remaining is rendered unclamped
      const remainingElem = screen.getByText("-3");
      expect(remainingElem).toBeInTheDocument();
      expect(remainingElem).toHaveClass("text-danger");
    });

    it("renders honest not-recorded state when entitlement is absent", () => {
      vi.spyOn(usePortalLeaveBalanceModule, "usePortalLeaveBalance").mockReturnValue({
        enabled: true,
        isLoading: false,
        isError: false,
        balance: null,
        leaveYearLabel: null,
      });

      render(<PortalLeaveBalanceCard />);

      // Both header and body state honestly that entitlement is not recorded
      const notRecorded = screen.getAllByText(NOT_RECORDED_LABEL);
      expect(notRecorded.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText("Your manager has not recorded a leave entitlement for this leave year."),
      ).toBeInTheDocument();
      // No fake figures
      expect(screen.queryByText("Approved")).not.toBeInTheDocument();
    });
  });

  describe("ShiftRequestsList vs PortalLeaveHistory segregation", () => {
    it("renders open-shift requests in ShiftRequestsList without carrying duplicate leave history", () => {
      vi.spyOn(usePortalOpenShiftsModule, "usePortalOpenShifts").mockReturnValue({
        enabled: true,
        isLoading: false,
        isError: false,
        retry: vi.fn(),
        openShifts: [],
        requests: [
          {
            requestId: "req-1",
            publishedShiftId: "ps-1",
            role: "Barista",
            date: "2026-06-08",
            start: "09:00",
            end: "17:00",
            locationName: "Espresso Bar",
            dayLabel: "Mon 8 Jun",
            status: "pending",
            decisionReason: "Under manager review",
          },
        ],
        requestFor: vi.fn(),
        busy: false,
        request: vi.fn(),
        withdraw: vi.fn(),
      });

      vi.spyOn(usePortalShiftReleasesModule, "usePortalShiftReleases").mockReturnValue({
        enabled: true,
        isLoading: false,
        isError: false,
        retry: vi.fn(),
        requests: [],
        requestFor: vi.fn(),
        isSaving: false,
        request: vi.fn(),
        withdraw: vi.fn(),
      });

      render(<ShiftRequestsList />);

      // Shows shift request
      expect(screen.getByText("Open shift · Barista · Mon 8 Jun")).toBeInTheDocument();
      expect(screen.getByText("Under manager review")).toBeInTheDocument();

      // Does NOT show any leave requests
      expect(screen.queryByText(/annual leave/i)).not.toBeInTheDocument();
    });

    it("renders leave history and manager response in PortalLeaveHistory", () => {
      const mockLeaveRequests: PortalLeaveRequest[] = [
        {
          id: "l-1",
          type: "Compassionate leave",
          date: "10 – 12 Jun",
          startIso: "2026-06-10",
          endIso: "2026-06-12",
          days: 3,
          reason: "Family emergency",
          status: "declined",
          submittedAt: "8 Jun",
          decisionReason: "Minimum staffing required for event",
        },
      ];

      render(
        <PortalLeaveHistory
          requests={mockLeaveRequests}
          isLoading={false}
          isError={false}
          isWithdrawing={false}
          onRetry={vi.fn()}
          onWithdraw={vi.fn()}
        />,
      );

      // Renders leave request with canonical type
      expect(screen.getByText("Compassionate leave")).toBeInTheDocument();
      expect(screen.getByText("Declined")).toBeInTheDocument();
      // Shows manager response on the card
      expect(screen.getByText("Minimum staffing required for event")).toBeInTheDocument();
    });
  });
});
