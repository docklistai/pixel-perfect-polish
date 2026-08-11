import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamAnnouncementComments } from "./TeamAnnouncementComments";
import type { TeamAnnouncementComment } from "../types";

const commentsA: TeamAnnouncementComment[] = [
  {
    id: "c1",
    body: "Briefing the FOH team at handover.",
    createdAt: "2026-08-10T09:00:00Z",
    authorName: "Sophie Carter",
  },
];

describe("announcement comments", () => {
  it("renders the notes belonging to the announcement it was given", () => {
    render(<TeamAnnouncementComments comments={commentsA} pending={false} onAdd={vi.fn()} />);
    expect(screen.getByText("Briefing the FOH team at handover.")).toBeInTheDocument();
    expect(screen.getByText("Manager notes (1)")).toBeInTheDocument();
  });

  it("does not bleed notes across announcements", () => {
    // The regression this replaces: the old drawer held comments in component
    // state that never reset, so one announcement's notes appeared under all of
    // them. Comments are now purely a function of the selected announcement.
    const { rerender } = render(
      <TeamAnnouncementComments comments={commentsA} pending={false} onAdd={vi.fn()} />,
    );
    expect(screen.getByText("Briefing the FOH team at handover.")).toBeInTheDocument();

    rerender(<TeamAnnouncementComments comments={[]} pending={false} onAdd={vi.fn()} />);
    expect(screen.queryByText("Briefing the FOH team at handover.")).not.toBeInTheDocument();
    expect(screen.getByText("Manager notes (0)")).toBeInTheDocument();
  });

  it("shows an honest empty state and names the audience for the notes", () => {
    render(<TeamAnnouncementComments comments={[]} pending={false} onAdd={vi.fn()} />);
    expect(screen.getByText(/visible to managers only/i)).toBeInTheDocument();
  });

  it("submits a trimmed note and clears the field on success", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(<TeamAnnouncementComments comments={[]} pending={false} onAdd={onAdd} />);
    const input = screen.getByLabelText("Add a manager note");
    await userEvent.type(input, "  Printed the new menu  ");
    await userEvent.click(screen.getByRole("button", { name: "Add manager note" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("Printed the new menu"));
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("keeps the draft when the write fails", async () => {
    const onAdd = vi.fn().mockResolvedValue(false);
    render(<TeamAnnouncementComments comments={[]} pending={false} onAdd={onAdd} />);
    const input = screen.getByLabelText("Add a manager note");
    await userEvent.type(input, "Printed the new menu");
    await userEvent.click(screen.getByRole("button", { name: "Add manager note" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(input).toHaveValue("Printed the new menu");
  });

  it("blocks an empty note and a second submit while one is pending", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    const { rerender } = render(
      <TeamAnnouncementComments comments={[]} pending={false} onAdd={onAdd} />,
    );
    expect(screen.getByRole("button", { name: "Add manager note" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Add a manager note"), "Note");
    rerender(<TeamAnnouncementComments comments={[]} pending onAdd={onAdd} />);
    expect(screen.getByRole("button", { name: "Add manager note" })).toBeDisabled();
  });
});
