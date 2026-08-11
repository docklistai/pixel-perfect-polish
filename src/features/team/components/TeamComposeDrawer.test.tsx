import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamComposeDrawer } from "./TeamComposeDrawer";
import { audienceKey } from "../lib/teamPresentation";
import type { TeamAudience } from "../types";

const audiences: TeamAudience[] = [
  { kind: "all_staff", departmentId: null, label: "All Staff", memberCount: 8 },
  { kind: "department", departmentId: "dept-kitchen", label: "Kitchen", memberCount: 2 },
  { kind: "managers", departmentId: null, label: "Managers only", memberCount: 1 },
];

function setup(overrides: Partial<React.ComponentProps<typeof TeamComposeDrawer>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  render(
    <TeamComposeDrawer
      open
      onOpenChange={onOpenChange}
      audiences={audiences}
      pending={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit, onOpenChange };
}

describe("compose drawer", () => {
  it("offers only audiences that exist in the workspace, with real counts", () => {
    setup();
    expect(screen.getByRole("option", { name: "All Staff (8)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Kitchen (2)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Managers only (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Housekeeping/ })).not.toBeInTheDocument();
  });

  it("states how many people the selected audience reaches", async () => {
    setup();
    expect(screen.getByText("This will reach 8 people in All Staff.")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/Send to/i), audienceKey(audiences[1]));
    expect(screen.getByText("This will reach 2 people in Kitchen.")).toBeInTheDocument();
  });

  it("keeps typed text — nothing is silently discarded", async () => {
    setup();
    const subject = screen.getByLabelText(/Subject/i);
    await userEvent.type(subject, "Summer menu");
    expect(subject).toHaveValue("Summer menu");
  });

  it("refuses to submit an empty subject or body and says why", async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("A subject is required.")).toBeInTheDocument();
    expect(screen.getByText("A message body is required.")).toBeInTheDocument();
  });

  it("submits the real payload — an audience KIND, never a recipient list", async () => {
    const { onSubmit, onOpenChange } = setup();
    await userEvent.type(screen.getByLabelText(/Subject/i), "  Summer menu  ");
    await userEvent.type(screen.getByLabelText(/^Body/i), "Please read this.");
    await userEvent.selectOptions(screen.getByLabelText(/Send to/i), audienceKey(audiences[1]));
    await userEvent.click(screen.getByLabelText(/Pin to top/i));
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      title: "Summer menu",
      body: "Please read this.",
      audienceKind: "department",
      audienceDepartmentId: "dept-kitchen",
      pinned: true,
      requiresAcknowledgement: true,
      highlightInUpdates: true,
    });
    expect(payload).not.toHaveProperty("recipientMembershipIds");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("stays open when the publish fails, so the draft is not lost", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const { onOpenChange } = setup({ onSubmit });
    await userEvent.type(screen.getByLabelText(/Subject/i), "Summer menu");
    await userEvent.type(screen.getByLabelText(/^Body/i), "Please read this.");
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("shows a submitting state and blocks a second publish", async () => {
    setup({ pending: true });
    const publish = screen.getByRole("button", { name: "Publishing…" });
    expect(publish).toBeDisabled();
  });

  it("preselects the audience when opened from a quick group", () => {
    setup({ presetAudienceKey: audienceKey(audiences[1]) });
    expect(screen.getByLabelText(/Send to/i)).toHaveValue(audienceKey(audiences[1]));
    expect(screen.getByText("This will reach 2 people in Kitchen.")).toBeInTheDocument();
  });

  it("does not promise anything is only a preview", () => {
    setup();
    expect(screen.queryByText(/preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sample/i)).not.toBeInTheDocument();
  });
});
