import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamBirthdayDialog } from "./TeamBirthdayDialog";
import type { TeamBirthday } from "../types";

const birthday = {
  staffMemberId: "staff-1",
  name: "Sophie Carter",
  birthDay: 5,
  birthMonth: 1,
  occurrenceDate: "2027-01-05",
  occurrenceYear: 2027,
  acknowledged: false,
} satisfies TeamBirthday;

describe("TeamBirthdayDialog", () => {
  it("acknowledges the backend-selected occurrence year without displaying it as a birth year", async () => {
    const onAcknowledge = vi.fn().mockResolvedValue(true);
    render(
      <TeamBirthdayDialog
        birthday={birthday}
        pending={false}
        onOpenChange={vi.fn()}
        onAcknowledge={onAcknowledge}
        onComposeNote={vi.fn()}
      />,
    );

    expect(screen.getByText("5 Jan")).toBeInTheDocument();
    expect(screen.queryByText("2027")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark acknowledged" }));
    expect(onAcknowledge).toHaveBeenCalledWith("staff-1", 2027);
  });
});
