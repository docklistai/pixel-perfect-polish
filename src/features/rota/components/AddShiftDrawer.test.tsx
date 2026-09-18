import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddShiftDrawer } from "./AddShiftDrawer";
import type { StaffMember } from "../types";

vi.mock("../hooks/useWorkspaceDepartments", () => ({
  useWorkspaceDepartments: () => ({
    departments: [],
    isLoading: false,
    isError: false,
    source: "demo",
    findDepartmentById: () => undefined,
  }),
}));

describe("AddShiftDrawer with secondary eligible roles", () => {
  const staff: StaffMember[] = [
    {
      id: "staff-1",
      name: "Alex Thompson",
      role: "Waiter",
      hrs: "40h",
      img: 1,
      tone: "info",
      eligibleRoles: ["Sommelier"],
    },
    {
      id: "staff-2",
      name: "Sam Rivers",
      role: "Bartender",
      hrs: "30h",
      img: 2,
      tone: "warning",
      eligibleRoles: [],
    },
  ];

  const days = [{ d: "Mon 8 Jun" }];
  const roles = ["Bartender", "Sommelier", "Waiter"];

  it("renders both primary and secondary-only roles in the role selector", () => {
    render(
      <AddShiftDrawer
        open={true}
        onOpenChange={() => {}}
        days={days}
        staff={staff}
        roles={roles}
        onSubmit={async () => {}}
      />,
    );

    const roleSelect = screen.getByLabelText(/role/i);
    expect(roleSelect).toBeInTheDocument();

    const options = Array.from(roleSelect.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("Bartender");
    expect(options).toContain("Waiter");
    // Secondary-only role
    expect(options).toContain("Sommelier");
  });

  it("allows assigning a staff member to their secondary-only eligible role", async () => {
    const onSubmit = vi.fn();
    render(
      <AddShiftDrawer
        open={true}
        onOpenChange={() => {}}
        days={days}
        staff={staff}
        roles={roles}
        onSubmit={onSubmit}
      />,
    );

    // Select secondary-only role Sommelier
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: "Sommelier" } });

    // Option for Alex Thompson shows as eligible and not disabled
    const alexOption = screen.getByRole("option", { name: /Alex Thompson · Waiter \(eligible\)/i });
    expect(alexOption).toBeInTheDocument();
    expect(alexOption).not.toBeDisabled();

    // Select Alex Thompson (whose secondary role is Sommelier)
    fireEvent.change(screen.getByLabelText(/^staff/i), { target: { value: "staff-1" } });

    // Click Save shift button
    const submitBtn = screen.getByRole("button", { name: /save shift/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: "staff-1",
        role: "Sommelier",
      }),
    );
  });

  it("marks staff as disabled and not eligible when they do not hold the role", () => {
    render(
      <AddShiftDrawer
        open={true}
        onOpenChange={() => {}}
        days={days}
        staff={staff}
        roles={roles}
        onSubmit={async () => {}}
      />,
    );

    // Select Sommelier
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: "Sommelier" } });

    // Sam Rivers (who only has Bartender, not Sommelier) is marked not eligible and disabled
    const samOption = screen.getByRole("option", { name: /Sam Rivers · Bartender \(not eligible\)/i });
    expect(samOption).toBeInTheDocument();
    expect(samOption).toBeDisabled();
  });
});
