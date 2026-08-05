import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OpsTimeline } from "./OpsTimeline";
import type { OpsEntry, OpsPageData, OpsTimelineRow } from "../types";

const timelineRow = (overrides: Partial<OpsTimelineRow> = {}): OpsTimelineRow => ({
  id: "event-1",
  kind: "entry_event",
  referenceId: "entry-1",
  entryType: "task",
  title: "Lock up",
  summary: "created",
  status: "open",
  occurredAt: "2026-08-04T09:00:00Z",
  actorName: "Olivia",
  locationName: "Venue",
  area: null,
  priority: "normal",
  ...overrides,
});

const entry = (id: string, title: string): OpsEntry =>
  ({
    id,
    title,
    entryType: "task",
    status: "open",
    priority: "normal",
    locationName: "Venue",
    area: null,
  }) as OpsEntry;

const facets: OpsPageData["facets"] = {
  topLevel: 12,
  tasks: 12,
  incidents: 0,
  open: 12,
  inProgress: 0,
  resolved: 0,
  archived: 0,
};

const feed = [
  timelineRow({ id: "handover-1", kind: "handover", referenceId: "handover-1", title: "Handover" }),
  timelineRow({ id: "briefing-1", kind: "briefing", referenceId: "briefing-1", title: "Briefing" }),
  timelineRow(),
];

const baseProps = {
  timeline: feed,
  timelineTruncated: false,
  timelineEntryEventLimit: 100,
  briefings: [],
  checklistRuns: [],
  onOpenEntry: vi.fn(),
  onOpenBriefing: vi.fn(),
  onOpenChecklist: vi.fn(),
  onNewBriefing: vi.fn(),
  onOpenHandover: vi.fn(),
  onMarkDone: vi.fn(),
  onTabChange: vi.fn(),
  facets,
  onPageChange: vi.fn(),
  pageSize: 2,
  total: 12,
};

describe("Ops timeline versus entry pagination", () => {
  it("shows no entry pagination controls on Today's timeline", () => {
    render(
      <OpsTimeline {...baseProps} tab="timeline" entries={[entry("entry-1", "Alpha")]} page={1} />,
    );
    expect(screen.queryByRole("button", { name: "View earlier entries" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Newer entries" })).toBeNull();
    expect(screen.queryByText(/^Page \d+ of \d+$/)).toBeNull();
  });

  it("keeps the same handover and briefing events on every entry page, exactly once", () => {
    const view = render(
      <OpsTimeline {...baseProps} tab="timeline" entries={[entry("entry-1", "Alpha")]} page={1} />,
    );
    const collaborationRows = () => ({
      handovers: screen.getAllByRole("button", { name: /^Handovercreated/ }).length,
      briefings: screen.getAllByRole("button", { name: /^Briefingcreated/ }).length,
    });
    expect(collaborationRows()).toEqual({ handovers: 1, briefings: 1 });

    // The entry page changed; the activity feed prop is unchanged, so the rendered
    // collaboration events must be identical — not duplicated, dropped or reordered.
    view.rerender(
      <OpsTimeline {...baseProps} tab="timeline" entries={[entry("entry-9", "Iota")]} page={5} />,
    );
    expect(collaborationRows()).toEqual({ handovers: 1, briefings: 1 });
    expect(
      screen
        .getAllByRole("button", { name: /^(Handover|Briefing|Lock up)created/ })
        .map((button) => button.textContent?.slice(0, 8)),
    ).toEqual(["Handover", "Briefing", "Lock up"].map((title) => `${title}created`.slice(0, 8)));
  });

  it("paginates the entry list on the entry tabs instead", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <OpsTimeline
        {...baseProps}
        onPageChange={onPageChange}
        tab="tasks"
        entries={[entry("entry-1", "Alpha"), entry("entry-2", "Beta")]}
        page={1}
      />,
    );
    expect(screen.getByText("Page 1 of 6")).toBeVisible();
    expect(screen.getByRole("button", { name: "Newer entries" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "View earlier entries" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("states the entry-event cap honestly, and only when entry events were bounded", () => {
    const view = render(
      <OpsTimeline {...baseProps} tab="timeline" entries={[entry("entry-1", "Alpha")]} page={1} />,
    );
    expect(screen.queryByText(/Showing the latest/)).toBeNull();

    view.rerender(
      <OpsTimeline
        {...baseProps}
        tab="timeline"
        entries={[entry("entry-1", "Alpha")]}
        page={1}
        timelineTruncated
      />,
    );
    expect(
      screen.getByText(
        /Showing the latest 100 operational updates\. Every handover and briefing for today is still listed\./,
      ),
    ).toBeVisible();
    // The cap never removes collaboration events, so the note must not claim otherwise.
    expect(screen.getAllByRole("button", { name: /^Handovercreated/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Briefingcreated/ })).toHaveLength(1);
  });

  it("does not offer to clear filters from the unfiltered activity feed", () => {
    render(
      <OpsTimeline
        {...baseProps}
        timeline={[]}
        tab="timeline"
        entries={[]}
        page={1}
        onClearFilter={vi.fn()}
      />,
    );
    expect(screen.getByText("No activity today")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });
});
