import { existsSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "lucide-react";
import { DashboardTertiaryRow } from "./DashboardTertiaryRow";
import type { ReactNode } from "react";
import type { QuickActionItem, TimesheetItem } from "../types";

/**
 * Home's tertiary row composition, as rendered.
 *
 * Phase 60 retired a demo placeholder card and added an experimental one, so
 * these tests pin what each surface actually shows. The live composition is the
 * important half: turning the Time Pulse experiment off must leave a live
 * manager with exactly the dashboard they had before Phase 60 existed.
 */

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode; className?: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

type RowProps = Parameters<typeof DashboardTertiaryRow>[0];

const timesheetItems: TimesheetItem[] = [
  { id: "t1", n: "Sam Okafor", d: "Wed 12 Aug", late: "12m late", img: 1 },
];

const quickActionItems: QuickActionItem[] = [
  { t: "Add shift", s: "Open the rota", icon: Calendar, route: "/rota" },
];

/** Time Pulse off: exactly what `useTimePulse` returns while the flag is off. */
const pulseOff: RowProps["timePulse"] = {
  enabled: false,
  isLoading: false,
  isError: false,
  isRefreshing: false,
  data: null,
  refresh: () => {},
};

const pulseOn: RowProps["timePulse"] = {
  ...pulseOff,
  enabled: true,
  data: {
    rows: [],
    locationCount: 1,
    generatedAt: "2026-08-18T09:00:00.000Z",
    workspaceTimezone: "Europe/London",
  },
};

function renderRow(overrides: Partial<RowProps> = {}) {
  const { container } = render(
    <DashboardTertiaryRow
      isLive
      timePulse={pulseOff}
      timesheetItems={timesheetItems}
      announcementItems={[]}
      quickActionItems={quickActionItems}
      {...overrides}
    />,
  );
  return container.firstElementChild as HTMLElement;
}

/** The eyebrow of every card that can appear in this row. */
const CARDS = {
  timePulse: "Time Pulse",
  timesheets: "Unapproved timesheets",
  announcements: "Recent announcements",
  quickActions: "Quick actions",
} as const;

function visibleCards(): string[] {
  return Object.values(CARDS).filter((label) => screen.queryByText(label) !== null);
}

describe("demo dashboard tertiary row", () => {
  it("renders exactly the three remaining cards", () => {
    renderRow({ isLive: false, timePulse: pulseOff });

    expect(visibleCards()).toEqual([CARDS.timesheets, CARDS.announcements, CARDS.quickActions]);
  });

  it("lays those three out as an intentional three-column row, with no empty fourth track", () => {
    const row = renderRow({ isLive: false, timePulse: pulseOff });

    expect(row).toHaveClass("xl:grid-cols-3");
    expect(row).not.toHaveClass("xl:grid-cols-4");
  });

  it("no longer shows the retired staff-on-shift placeholder", () => {
    renderRow({ isLive: false, timePulse: pulseOff });

    // It hardcoded a zero count and an empty state while ignoring its data.
    expect(screen.queryByText("On shift today")).toBeNull();
    expect(screen.queryByText("No staff currently clocked in.")).toBeNull();
    expect(existsSync("src/features/dashboard/components/DashboardStaffOnShift.tsx")).toBe(false);
  });

  it("never shows Time Pulse, which cannot be enabled on a demo surface", () => {
    renderRow({ isLive: false, timePulse: pulseOff });

    expect(screen.queryByText(CARDS.timePulse)).toBeNull();
  });
});

describe("live dashboard with the Time Pulse experiment off", () => {
  it("preserves the pre-Phase-60 live card composition exactly", () => {
    renderRow({ isLive: true, timePulse: pulseOff });

    expect(visibleCards()).toEqual([CARDS.timesheets, CARDS.quickActions]);
    // Announcements has always been demo-only on this row.
    expect(screen.queryByText(CARDS.announcements)).toBeNull();
    expect(screen.queryByText(CARDS.timePulse)).toBeNull();
  });

  it("keeps the live column count unchanged, so the experiment cannot reflow it", () => {
    const off = renderRow({ isLive: true, timePulse: pulseOff });

    expect(off).toHaveClass("xl:grid-cols-4");
  });
});

describe("live dashboard with the Time Pulse experiment on", () => {
  it("adds Time Pulse without removing any existing live card", () => {
    renderRow({ isLive: true, timePulse: pulseOn });

    expect(visibleCards()).toEqual([CARDS.timePulse, CARDS.timesheets, CARDS.quickActions]);
  });

  it("reflows nothing: the live row keeps the same column count as with it off", () => {
    const on = renderRow({ isLive: true, timePulse: pulseOn });

    expect(on).toHaveClass("xl:grid-cols-4");
  });

  it("still shows the real live timesheet data alongside it", () => {
    renderRow({ isLive: true, timePulse: pulseOn });

    expect(screen.getByText("Sam Okafor")).toBeInTheDocument();
  });
});
