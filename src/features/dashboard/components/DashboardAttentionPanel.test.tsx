import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardAttentionPanel } from "./DashboardAttentionPanel";
import { buildAttentionItems } from "../lib/dashboardAttention";
import type { AttentionItem } from "../types";

/**
 * The attention panel as rendered.
 *
 * Phase 61 grew the queue from three signals to five, so these tests pin that
 * every active item is shown (there is no cap), and that the empty state stays
 * a plain statement rather than something that manufactures urgency.
 */

function renderPanel(items: AttentionItem[], onAlertClick = vi.fn(), onViewAll = vi.fn()) {
  render(
    <DashboardAttentionPanel
      items={items}
      total={items.length}
      onAlertClick={onAlertClick}
      onViewAll={onViewAll}
    />,
  );
  return { onAlertClick, onViewAll };
}

const fourSignals = buildAttentionItems({
  weekScope: "current",
  openShifts: 2,
  pendingTimeCount: 3,
  pendingLeaveCount: 1,
  highLeave: null,
  rotaIssueCount: 1,
  rotaIssuesResolved: true,
  hasPublishedSnapshot: true,
  hasUnpublishedChanges: true,
});

describe("DashboardAttentionPanel — empty state", () => {
  it("states the all-clear plainly and offers no alarm", () => {
    renderPanel([]);
    expect(screen.getByText("You're all clear")).toBeInTheDocument();
    expect(
      screen.getByText("No open shifts, pending timesheets, or leave decisions right now."),
    ).toBeInTheDocument();
  });

  it("shows a zero badge and hides the view-all affordance", () => {
    renderPanel([]);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText(/View all alerts/)).not.toBeInTheDocument();
  });
});

describe("DashboardAttentionPanel — populated", () => {
  it("renders every active item with no cap", () => {
    renderPanel(fourSignals);
    expect(fourSignals).toHaveLength(4);
    for (const item of fourSignals) {
      expect(screen.getByText(item.t)).toBeInTheDocument();
    }
  });

  it("keeps the queue order it was given", () => {
    renderPanel(fourSignals);
    const rendered = screen
      .getAllByRole("button")
      .map((button) => button.textContent ?? "")
      .filter((text) => fourSignals.some((item) => text.includes(item.t)));
    expect(rendered).toHaveLength(4);
    fourSignals.forEach((item, index) => {
      expect(rendered[index]).toContain(item.t);
    });
  });

  it("shows the reason line beside each title", () => {
    renderPanel(fourSignals);
    // An open rota issue suppresses the generic unpublished notice, so the
    // reason shown here is the specific one.
    expect(
      screen.getByText("Leave changed after this week's rota was published"),
    ).toBeInTheDocument();
    expect(screen.getByText("Resolve open shifts before publishing")).toBeInTheDocument();
  });

  it("badges the exact total and offers view-all", () => {
    renderPanel(fourSignals);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/View all alerts \(4\)/)).toBeInTheDocument();
  });

  it("reports the index of the item that was clicked", async () => {
    const user = userEvent.setup();
    const { onAlertClick } = renderPanel(fourSignals);
    await user.click(screen.getByText(fourSignals[2]!.t));
    expect(onAlertClick).toHaveBeenCalledWith(2);
  });

  it("calls view-all rather than opening one item", async () => {
    const user = userEvent.setup();
    const { onAlertClick, onViewAll } = renderPanel(fourSignals);
    await user.click(screen.getByText(/View all alerts/));
    expect(onViewAll).toHaveBeenCalledTimes(1);
    expect(onAlertClick).not.toHaveBeenCalled();
  });
});
