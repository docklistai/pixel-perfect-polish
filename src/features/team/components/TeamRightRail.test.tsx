import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamRightRail } from "./TeamRightRail";
import type { TeamAudience, TeamBirthday, TeamStaffEvent, TeamTrainingReminder } from "../types";

const audiences: TeamAudience[] = [
  { kind: "all_staff", departmentId: null, label: "All Staff", memberCount: 8 },
  { kind: "department", departmentId: "dept-kitchen", label: "Kitchen", memberCount: 2 },
];

const training: TeamTrainingReminder[] = [
  {
    id: "t1",
    title: "Food safety refresher",
    source: "staff_records",
    audienceKind: "department",
    audienceLabel: "Kitchen",
    dueAt: "2026-08-13T09:00:00Z",
    mandatory: true,
    status: "open",
    note: null,
    assignedCount: 2,
    completedCount: 1,
    assignees: [],
  },
];

const birthdays: TeamBirthday[] = [
  {
    staffMemberId: "s1",
    name: "Sophie Carter",
    birthDay: 9,
    birthMonth: 6,
    occurrenceDate: "2026-06-09",
    occurrenceYear: 2026,
    acknowledged: false,
  },
];

const events: TeamStaffEvent[] = [
  { id: "e1", title: "Summer social", occursAt: "2026-08-20T18:00:00Z" },
];

function setup(overrides: Partial<React.ComponentProps<typeof TeamRightRail>> = {}) {
  const onSelectBirthday = vi.fn();
  const onSelectTraining = vi.fn();
  const onComposeForAudience = vi.fn();
  render(
    <TeamRightRail
      training={training}
      birthdays={birthdays}
      events={events}
      audiences={audiences}
      onSelectBirthday={onSelectBirthday}
      onSelectTraining={onSelectTraining}
      onComposeForAudience={onComposeForAudience}
      {...overrides}
    />,
  );
  return { onSelectBirthday, onSelectTraining, onComposeForAudience };
}

describe("team right rail", () => {
  it("renders live training, birthdays, events and groups", () => {
    setup();
    expect(screen.getByText("Food safety refresher")).toBeInTheDocument();
    expect(screen.getByText("Sophie Carter")).toBeInTheDocument();
    expect(screen.getByText("Summer social")).toBeInTheDocument();
    expect(screen.getByText("All Staff")).toBeInTheDocument();
  });

  it("shows a birthday as day and month only — no year is stored", () => {
    setup();
    expect(screen.getByText("9 Jun")).toBeInTheDocument();
    expect(screen.queryByText(/\d{4}/)).not.toBeInTheDocument();
  });

  it("shows real group counts from the workspace", () => {
    setup();
    expect(screen.getByText("8 members")).toBeInTheDocument();
    expect(screen.getByText("2 members")).toBeInTheDocument();
  });

  it("singularises a one-person group", () => {
    setup({
      audiences: [{ kind: "managers", departmentId: null, label: "Managers only", memberCount: 1 }],
    });
    expect(screen.getByText("1 member")).toBeInTheDocument();
  });

  it("prefills compose from a quick group", async () => {
    const { onComposeForAudience } = setup();
    await userEvent.click(screen.getByText("Kitchen"));
    expect(onComposeForAudience).toHaveBeenCalledWith("department:dept-kitchen");
  });

  it("opens the real training reminder that was clicked", async () => {
    const { onSelectTraining } = setup();
    await userEvent.click(screen.getByText("Food safety refresher"));
    expect(onSelectTraining).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });

  it("tells the truth when each section is empty instead of showing samples", () => {
    setup({ training: [], birthdays: [], events: [], audiences: [] });
    expect(screen.getByText("No training reminders are set up yet.")).toBeInTheDocument();
    expect(screen.getByText(/No birthdays are recorded/)).toBeInTheDocument();
    expect(screen.getByText("No upcoming staff events.")).toBeInTheDocument();
    expect(screen.getByText(/No audiences yet/)).toBeInTheDocument();
    expect(screen.queryByText(/sample/i)).not.toBeInTheDocument();
  });

  it("keeps staff events informational — the card offers no actions", () => {
    setup({ training: [], birthdays: [], audiences: [] });
    expect(screen.getByText("Summer social")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
