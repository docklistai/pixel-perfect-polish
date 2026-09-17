import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SampleBadge } from "./dl";
import { DashboardLabourWatch } from "@/features/dashboard/components/DashboardLabourWatch";
import { AccessRoleDialog } from "@/features/settings/components/AccessRoleDialog";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode; className?: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("SampleBadge primitive", () => {
  it("renders a Sample badge by default", () => {
    render(<SampleBadge />);
    const badge = screen.getByText("Sample");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("badge");
  });

  it("suppresses rendering when sample is false", () => {
    const { container } = render(<SampleBadge sample={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Sample")).toBeNull();
  });

  it("applies custom title attribute", () => {
    render(<SampleBadge title="Custom sample notice" />);
    expect(screen.getByTitle("Custom sample notice")).toBeInTheDocument();
  });
});

describe("DashboardLabourWatch — Sample badge gating", () => {
  it("renders Sample badge when sample is true (demo mode)", () => {
    render(
      <DashboardLabourWatch
        labourCost="£4,500"
        projectedSales="£15,000"
        labourPct={30}
        sample={true}
      />,
    );
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });

  it("suppresses Sample badge when sample is omitted or false (live mode)", () => {
    render(
      <DashboardLabourWatch
        labourCost="£4,500"
        projectedSales="£15,000"
        labourPct={30}
        sample={false}
      />,
    );
    expect(screen.queryByText("Sample")).toBeNull();
  });
});

describe("Sample drill-in persistence — AccessRoleDialog", () => {
  it("carries the Sample badge on drill-in to a sample role", () => {
    render(
      <AccessRoleDialog
        role={{
          id: "gm",
          name: "General manager",
          people: 2,
          scope: "Full workspace access",
          tags: [{ label: "Publish rota", tone: "success" }],
          capabilities: [["Publish rota", true]],
        }}
        onClose={() => {}}
        onDirty={() => {}}
      />,
    );

    // The modal carries both the role title and the sample badge
    expect(screen.getByText("General manager permissions")).toBeInTheDocument();
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });
});
