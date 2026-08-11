import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PortalAnnouncementDrawer } from "./PortalAnnouncementDrawer";
import type { PortalTeamAnnouncement } from "../api/portalTeamAnnouncements";

function announcement(overrides: Partial<PortalTeamAnnouncement> = {}): PortalTeamAnnouncement {
  return {
    id: "a1",
    title: "Summer menu",
    body: "Please read the new summer menu before Monday.",
    pinned: false,
    requiresAcknowledgement: true,
    highlighted: false,
    publishedAt: "2026-08-10T09:00:00Z",
    readAt: null,
    acknowledgedAt: null,
    ...overrides,
  };
}

function setup(overrides: Partial<React.ComponentProps<typeof PortalAnnouncementDrawer>> = {}) {
  const onAcknowledge = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();
  render(
    <PortalAnnouncementDrawer
      announcement={announcement()}
      busy={false}
      onClose={onClose}
      onAcknowledge={onAcknowledge}
      formatStamp={(iso) => `stamp:${iso}`}
      {...overrides}
    />,
  );
  return { onAcknowledge, onClose };
}

describe("staff announcement drawer", () => {
  it("shows the real announcement content", () => {
    setup();
    expect(screen.getByText("Please read the new summer menu before Monday.")).toBeInTheDocument();
    expect(screen.getByText("Posted stamp:2026-08-10T09:00:00Z")).toBeInTheDocument();
  });

  it("offers the confirm action when one was asked for", async () => {
    const { onAcknowledge } = setup();
    expect(screen.getByText("Needs your confirmation")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm I've read this/ }));
    await waitFor(() => expect(onAcknowledge).toHaveBeenCalledWith("a1"));
  });

  it("locks the action truthfully once confirmed", () => {
    setup({
      announcement: announcement({ acknowledgedAt: "2026-08-10T11:00:00Z" }),
    });
    expect(screen.getByRole("button", { name: "Confirmed" })).toBeDisabled();
    expect(screen.getByText(/You confirmed this on stamp:/)).toBeInTheDocument();
    expect(screen.queryByText("Needs your confirmation")).not.toBeInTheDocument();
  });

  it("shows no confirm action when none was asked for", () => {
    setup({ announcement: announcement({ requiresAcknowledgement: false }) });
    expect(screen.queryByRole("button", { name: /Confirm/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Needs your confirmation")).not.toBeInTheDocument();
  });

  it("blocks the action while a write is in flight", () => {
    setup({ busy: true });
    expect(screen.getByRole("button", { name: /Confirm I've read this/ })).toBeDisabled();
  });

  it("exposes no manager-only data and no reply affordance", () => {
    setup();
    // No roster, no read counts, no manager notes, no comment box.
    expect(screen.queryByText(/of \d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/manager note/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/reply/i)).not.toBeInTheDocument();
  });

  it("renders nothing when no announcement is selected", () => {
    const { container } = render(
      <PortalAnnouncementDrawer
        announcement={null}
        busy={false}
        onClose={vi.fn()}
        onAcknowledge={vi.fn()}
        formatStamp={(iso) => iso}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
