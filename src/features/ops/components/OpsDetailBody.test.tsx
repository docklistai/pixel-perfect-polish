import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OpsEntry, OpsEntryDetail } from "../types";
import { OpsDetailBody } from "./OpsDetailBody";

vi.mock("./OpsEntryContextCard", () => ({ OpsEntryContextCard: () => <div>Entry context</div> }));

describe("Ops detail history", () => {
  it("renders retained lifecycle events and follow-up state", () => {
    const entry = {
      id: "entry-1",
      title: "Freezer alarm",
      status: "open",
      priority: "critical",
      parentEntryId: null,
      assignedStaffMemberId: null,
    } as OpsEntry;
    const detail = {
      events: [
        {
          id: "event-1",
          eventType: "note_added",
          note: "Engineer called",
          resultingStatus: "open",
          occurredAt: "2026-08-03T09:00:00Z",
          actorName: "Olivia",
          details: {},
        },
      ],
      followUps: [
        {
          id: "child-1",
          title: "Confirm repair",
          status: "in_progress",
          priority: "high",
          dueAt: null,
        },
      ],
    } as OpsEntryDetail;
    render(
      <OpsDetailBody
        entry={entry}
        detail={detail}
        staff={[]}
        pending={false}
        onAddNote={vi.fn()}
        onAssign={vi.fn()}
        onAddFollowUp={vi.fn()}
        onOpenFollowUp={vi.fn()}
        onStatus={vi.fn()}
      />,
    );
    expect(screen.getByText("Engineer called")).toBeInTheDocument();
    expect(screen.getByText("Confirm repair")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });
});
