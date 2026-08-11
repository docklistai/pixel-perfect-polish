import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamAnnouncementList } from "./TeamAnnouncementList";
import type { TeamAnnouncement, TeamAudience } from "../types";

const audiences: TeamAudience[] = [
  { kind: "all_staff", departmentId: null, label: "All Staff", memberCount: 8 },
  { kind: "department", departmentId: "dept-kitchen", label: "Kitchen", memberCount: 2 },
];

function announcement(overrides: Partial<TeamAnnouncement> = {}): TeamAnnouncement {
  return {
    id: "a1",
    title: "Summer menu",
    body: "Please read the new summer menu.",
    pinned: false,
    audienceKind: "all_staff",
    audienceDepartmentId: null,
    audienceLabel: "All Staff",
    requiresAcknowledgement: true,
    highlightInUpdates: true,
    publishedAt: "2026-08-10T09:00:00Z",
    authorName: "Alex",
    recipientCount: 8,
    readCount: 6,
    acknowledgedCount: 5,
    viewerAcknowledged: false,
    viewerIsRecipient: false,
    recipients: [],
    comments: [],
    ...overrides,
  };
}

function setup(announcements: TeamAnnouncement[]) {
  const onSelect = vi.fn();
  const onCompose = vi.fn();
  render(
    <TeamAnnouncementList
      announcements={announcements}
      audiences={audiences}
      onSelect={onSelect}
      onCompose={onCompose}
    />,
  );
  return { onSelect, onCompose };
}

describe("announcement list", () => {
  it("renders live rows with real read counts", () => {
    setup([announcement()]);
    expect(screen.getByText("Summer menu")).toBeInTheDocument();
    expect(screen.getByText("6 / 8 read")).toBeInTheDocument();
    // "All Staff" is both the row's audience badge and a filter option, so
    // assert the badge specifically rather than matching either.
    expect(document.querySelector(".badge.outline")).toHaveTextContent("All Staff");
    expect(screen.getByText("Acknowledgement asked")).toBeInTheDocument();
  });

  it("derives tab counts from the rows, not from a fixture", () => {
    setup([
      announcement({ id: "a1", pinned: true }),
      announcement({ id: "a2", acknowledgedCount: 8, recipientCount: 8, readCount: 8 }),
    ]);
    expect(screen.getByRole("tab", { name: /^All/ })).toHaveTextContent("2");
    expect(screen.getByRole("tab", { name: /^Pinned/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /^Awaiting ack/ })).toHaveTextContent("1");
  });

  it("filters by tab", async () => {
    setup([
      announcement({ id: "a1", title: "Pinned one", pinned: true }),
      announcement({ id: "a2", title: "Unpinned one" }),
    ]);
    await userEvent.click(screen.getByRole("tab", { name: /^Pinned/ }));
    expect(screen.getByText("Pinned one")).toBeInTheDocument();
    expect(screen.queryByText("Unpinned one")).not.toBeInTheDocument();
  });

  it("filters by a real workspace audience", async () => {
    setup([
      announcement({ id: "a1", title: "Everyone", audienceLabel: "All Staff" }),
      announcement({ id: "a2", title: "Kitchen only", audienceLabel: "Kitchen" }),
    ]);
    await userEvent.selectOptions(screen.getByLabelText("Filter by audience"), "Kitchen");
    expect(screen.getByText("Kitchen only")).toBeInTheDocument();
    expect(screen.queryByText("Everyone")).not.toBeInTheDocument();
  });

  it("offers only audiences that exist in this workspace", () => {
    setup([announcement()]);
    const options = screen
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);
    expect(options).toEqual(["All audiences", "All Staff", "Kitchen"]);
  });

  it("selects the real announcement that was clicked", async () => {
    const { onSelect } = setup([announcement({ id: "a1", title: "Summer menu" })]);
    await userEvent.click(screen.getByText("Summer menu"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("shows a genuine empty state and routes to compose, not sample rows", async () => {
    const { onCompose } = setup([]);
    expect(screen.getByText("No announcements yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Compose announcement" }));
    expect(onCompose).toHaveBeenCalled();
  });

  it("distinguishes an empty filter from an empty workspace", async () => {
    setup([announcement({ id: "a1", pinned: false })]);
    await userEvent.click(screen.getByRole("tab", { name: /^Pinned/ }));
    expect(screen.getByText("Nothing matches this filter")).toBeInTheDocument();
    expect(screen.queryByText("No announcements yet")).not.toBeInTheDocument();
  });

  it("carries no dead controls", () => {
    setup([announcement()]);
    // The permanently-disabled "Preview list" footer button and the decorative
    // overflow glyph that looked like a menu are both gone.
    expect(screen.queryByRole("button", { name: /Preview list/i })).not.toBeInTheDocument();
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toBeDisabled();
    }
  });
});
