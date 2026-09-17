import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PortalThisWeekCard } from "./PortalThisWeekCard";
import * as usePortalRotaModule from "../hooks/usePortalRota";
import * as usePortalLeaveRequestsModule from "../hooks/usePortalLeaveRequests";
import * as usePortalTimezoneModule from "../hooks/usePortalTimezone";
import type { PortalShift } from "../types";

vi.mock("@/features/demo/store/useWorkspaceStore", () => ({
  useWorkspaceSelector: () => [],
}));

const MOCK_WEEK_DAYS = [
  { iso: "2026-06-08", dayNum: 8, letter: "M" },
  { iso: "2026-06-09", dayNum: 9, letter: "T" },
  { iso: "2026-06-10", dayNum: 10, letter: "W" },
  { iso: "2026-06-11", dayNum: 11, letter: "T" },
  { iso: "2026-06-12", dayNum: 12, letter: "F" },
  { iso: "2026-06-13", dayNum: 13, letter: "S" },
  { iso: "2026-06-14", dayNum: 14, letter: "S" },
];

function makeShift(overrides: Partial<PortalShift> = {}): PortalShift {
  return {
    id: "shift-1",
    date: "2026-06-08",
    dayLabel: "Mon 8 Jun",
    start: "09:00",
    end: "17:00",
    hours: 8,
    role: "Barista",
    station: "Main Bar",
    breakMinutes: 30,
    status: "confirmed",
    sourceSnapshotVersion: 1,
    publishedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("PortalThisWeekCard", () => {
  beforeEach(() => {
    vi.spyOn(usePortalTimezoneModule, "usePortalTimezone").mockReturnValue("UTC");
  });

  it("renders honest empty state when hasPublished is false", () => {
    vi.spyOn(usePortalRotaModule, "usePortalRota").mockReturnValue({
      hasPublished: false,
      upcoming: [],
      history: [],
      nextShift: null,
      weekDays: MOCK_WEEK_DAYS,
      weekLabel: "8 – 14 Jun 2026",
      activeShift: null,
      source: "demo",
      isLoading: false,
      isError: false,
      retry: vi.fn(),
    });

    vi.spyOn(usePortalLeaveRequestsModule, "usePortalLeaveRequests").mockReturnValue({
      enabled: false,
      isLive: false,
      isLoading: false,
      isError: false,
      retry: vi.fn(),
      isWithdrawing: false,
      withdraw: vi.fn(),
      approvedLeave: [],
      requestHistory: [],
    });

    render(<PortalThisWeekCard onNavigate={vi.fn()} />);

    expect(screen.getByText("No published rota for this week")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your shifts and days off will appear here once your manager publishes this week's rota.",
      ),
    ).toBeInTheDocument();
    // No days of the week rendered in empty state
    expect(screen.queryByText("Mon")).not.toBeInTheDocument();
  });

  it("renders the 7-day week with assigned shifts, overnight finish, approved leave, and off days", () => {
    vi.spyOn(usePortalRotaModule, "usePortalRota").mockReturnValue({
      hasPublished: true,
      upcoming: [
        makeShift({
          id: "s1",
          date: "2026-06-08",
          start: "09:00",
          end: "17:00",
          role: "Barista",
          station: "Espresso Bar",
        }),
        makeShift({
          id: "s2",
          date: "2026-06-11",
          start: "22:00",
          end: "06:00",
          role: "Closer",
          station: "Main Bar",
        }),
      ],
      history: [],
      nextShift: null,
      weekDays: MOCK_WEEK_DAYS,
      weekLabel: "8 – 14 Jun 2026",
      activeShift: null,
      source: "demo",
      isLoading: false,
      isError: false,
      retry: vi.fn(),
    });

    vi.spyOn(usePortalLeaveRequestsModule, "usePortalLeaveRequests").mockReturnValue({
      enabled: true,
      isLive: true,
      isLoading: false,
      isError: false,
      retry: vi.fn(),
      isWithdrawing: false,
      withdraw: vi.fn(),
      approvedLeave: [],
      requestHistory: [
        {
          id: "l1",
          type: "Annual leave",
          date: "12 Jun",
          startIso: "2026-06-12",
          endIso: "2026-06-12",
          days: 1,
          reason: "Holiday",
          status: "approved",
          submittedAt: "1 Jun",
        },
      ],
    });

    render(<PortalThisWeekCard onNavigate={vi.fn()} />);

    // Week label
    expect(screen.getByText("8 – 14 Jun 2026")).toBeInTheDocument();

    // Monday shift
    expect(screen.getByText("09:00 – 17:00")).toBeInTheDocument();
    expect(screen.getByText("Barista · Espresso Bar")).toBeInTheDocument();

    // Thursday overnight shift
    expect(screen.getByText("22:00 – 06:00")).toBeInTheDocument();
    expect(screen.getByText("+1 next day")).toBeInTheDocument();
    expect(screen.getByText("Closer · Main Bar")).toBeInTheDocument();

    // Friday approved leave context
    expect(screen.getByText("Annual leave (Approved)")).toBeInTheDocument();

    // Off days (Tuesday, Wednesday, Saturday, Sunday)
    const offLabels = screen.getAllByText("Off");
    expect(offLabels.length).toBe(4);

    // Never exposes contracted hours, labour cost, or manager metrics
    expect(screen.queryByText(/contracted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/labour/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/budget/i)).not.toBeInTheDocument();
  });
});
