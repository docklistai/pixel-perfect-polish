// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamCreationDrawer } from "./TeamCreationDrawer";
import type { TeamAudience } from "../types";

const mockAudiences: TeamAudience[] = [
  {
    kind: "all_staff",
    departmentId: null,
    label: "All staff",
    memberCount: 12,
  },
  {
    kind: "department",
    departmentId: "11111111-1111-1111-1111-111111111111",
    label: "Kitchen",
    memberCount: 5,
  },
];

describe("TeamCreationDrawer", () => {
  it("renders training reminder fields by default", () => {
    render(
      <TeamCreationDrawer
        open={true}
        onOpenChange={vi.fn()}
        audiences={mockAudiences}
        pending={false}
        initialKind="training"
        onCreateTraining={vi.fn()}
        onCreateEvent={vi.fn()}
      />,
    );

    expect(screen.getByText("Add training reminder")).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Due date & time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Audience/i)).toBeInTheDocument();
    expect(screen.getByText("Mandatory training")).toBeInTheDocument();
  });

  it("switches to staff event mode", async () => {
    render(
      <TeamCreationDrawer
        open={true}
        onOpenChange={vi.fn()}
        audiences={mockAudiences}
        pending={false}
        initialKind="training"
        onCreateTraining={vi.fn()}
        onCreateEvent={vi.fn()}
      />,
    );

    const eventBtn = screen.getByRole("button", { name: /Staff event/i });
    fireEvent.click(eventBtn);

    expect(screen.getByText("Add staff event")).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date & time/i)).toBeInTheDocument();
    // In event mode, audience and mandatory are not shown
    expect(screen.queryByLabelText(/Audience/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Mandatory training")).not.toBeInTheDocument();
  });

  it("submits training reminder data correctly", async () => {
    const handleCreateTraining = vi.fn().mockResolvedValue(true);
    const handleOpenChange = vi.fn();

    render(
      <TeamCreationDrawer
        open={true}
        onOpenChange={handleOpenChange}
        audiences={mockAudiences}
        pending={false}
        initialKind="training"
        onCreateTraining={handleCreateTraining}
        onCreateEvent={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: "Health & Safety Induction" } });

    const submitBtn = screen.getByRole("button", { name: "Create reminder" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleCreateTraining).toHaveBeenCalledTimes(1);
    });

    expect(handleCreateTraining).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "training",
        title: "Health & Safety Induction",
        audienceKind: "all_staff",
        mandatory: false,
      }),
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
