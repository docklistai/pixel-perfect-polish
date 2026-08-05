import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OpsTimelineEntry } from "./OpsTimelineEntry";

describe("Ops timeline row actions", () => {
  it("keeps overflow actions keyboard-accessible and offers quick completion", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onMarkDone = vi.fn();
    render(
      <OpsTimelineEntry
        row={{
          id: "event-1",
          kind: "entry_event",
          referenceId: "entry-1",
          entryType: "task",
          title: "Lock up",
          summary: "created",
          status: "open",
          occurredAt: "2026-08-03T09:00:00Z",
          actorName: "Olivia",
          locationName: "Venue",
          area: null,
          priority: "normal",
        }}
        onOpen={onOpen}
        onMarkDone={onMarkDone}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Lock up" }));
    await user.click(await screen.findByRole("menuitem", { name: "Mark done" }));
    expect(onMarkDone).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /^Lock upcreated/ })).toBeVisible();
  });
});
