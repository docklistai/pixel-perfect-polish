import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalProfileDrawer } from "./PortalProfileDrawer";
import type { PortalProfile } from "../types";

function mockProfile(overrides: Partial<PortalProfile> = {}): PortalProfile {
  return {
    staffId: "staff-1",
    name: "Alex Smith",
    initials: "AS",
    role: "Server",
    department: "Front of House",
    workspaceName: "Test Workspace",
    email: "alex@example.com",
    phone: "07123456789",
    accessStatus: "active",
    timezone: "UTC",
    manager: {
      name: "",
      email: "",
      phone: "",
    },
    staffContact: {
      name: "",
      email: "",
      phone: "",
    },
    ...overrides,
  };
}

describe("PortalProfileDrawer", () => {
  it("renders staff contact section honestly when contact details are not set", () => {
    render(<PortalProfileDrawer open={true} onClose={vi.fn()} profile={mockProfile()} />);

    expect(screen.getByText("Staff contact")).toBeInTheDocument();
    const notSetElements = screen.getAllByText("Not set");
    expect(notSetElements.length).toBeGreaterThanOrEqual(3);

    // No dead mailto or tel action buttons
    expect(screen.queryByRole("button", { name: /Email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Call/i })).not.toBeInTheDocument();
  });

  it("renders action buttons when staff contact email and phone are configured", () => {
    render(
      <PortalProfileDrawer
        open={true}
        onClose={vi.fn()}
        profile={mockProfile({
          staffContact: {
            name: "Jane Manager",
            email: "jane@company.com",
            phone: "07987654321",
          },
        })}
      />,
    );

    expect(screen.getByText("Jane Manager")).toBeInTheDocument();
    expect(screen.getByText("jane@company.com")).toBeInTheDocument();
    expect(screen.getByText("07987654321")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Call/i })).toBeInTheDocument();
  });
});
