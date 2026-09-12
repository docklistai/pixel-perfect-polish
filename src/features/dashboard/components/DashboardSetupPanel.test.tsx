import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Store, UserPlus } from "lucide-react";
import { DashboardSetupPanel } from "./DashboardSetupPanel";
import type { DashboardSetupPlan, DashboardSetupStep } from "../lib/dashboardSetup";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));

function step(overrides: Partial<DashboardSetupStep>): DashboardSetupStep {
  return {
    id: "basics",
    title: "Step",
    description: "Description",
    done: false,
    route: "/settings",
    cta: "Go",
    icon: Store,
    ...overrides,
  };
}

function plan(steps: DashboardSetupStep[]): DashboardSetupPlan {
  return {
    show: true,
    mode: "workspace",
    title: "Set up your workspace",
    subtitle: "A few quick steps to your first published rota.",
    steps,
    doneCount: 0,
    showAccessCodesHint: false,
  };
}

describe("DashboardSetupPanel navigation", () => {
  it("sends the basics step's Workspace search key to Settings", async () => {
    const user = userEvent.setup();
    navigate.mockClear();
    const basics = step({
      id: "basics",
      title: "Set your business basics",
      cta: "Open settings",
      route: "/settings",
      search: { tab: "workspace" },
    });
    render(<DashboardSetupPanel plan={plan([basics])} />);

    await user.click(screen.getByRole("button", { name: "Open settings" }));

    expect(navigate).toHaveBeenCalledWith({ to: "/settings", search: { tab: "workspace" } });
  });

  it("does not carry a Workspace search onto a Settings step that has none", async () => {
    const user = userEvent.setup();
    navigate.mockClear();
    const location = step({
      id: "location",
      title: "No active location",
      cta: "See what to do",
      route: "/settings",
    });
    render(<DashboardSetupPanel plan={plan([location])} />);

    await user.click(screen.getByRole("button", { name: "See what to do" }));

    expect(navigate).toHaveBeenCalledWith({ to: "/settings", search: {} });
  });

  it("leaves non-Settings step navigation unchanged", async () => {
    const user = userEvent.setup();
    navigate.mockClear();
    const team = step({
      id: "team",
      title: "Add your team",
      cta: "Add staff",
      route: "/staff",
      icon: UserPlus,
    });
    render(<DashboardSetupPanel plan={plan([team])} />);

    await user.click(screen.getByRole("button", { name: "Add staff" }));

    expect(navigate).toHaveBeenCalledWith({ to: "/staff" });
  });
});
