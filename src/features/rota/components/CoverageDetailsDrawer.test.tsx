import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoverageDetailsDrawer } from "./CoverageDetailsDrawer";

describe("CoverageDetailsDrawer factual assignment", () => {
  it("renders factual composition for partial week with open shifts", () => {
    const { container } = render(
      <CoverageDetailsDrawer
        open
        onOpenChange={vi.fn()}
        staffCount={5}
        openShiftCount={1}
        conflictCount={0}
        plannedShiftCount={5}
        assignedShiftCount={4}
        roleCoverage={[{ label: "Chef", value: "4 of 5 assigned · 1 open", tone: "info" }]}
      />,
    );

    expect(screen.getAllByText("4 of 5 assigned · 1 open").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 open shift")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/%/);
    expect(container.querySelector("[style*='width']")).not.toBeInTheDocument();
  });

  it("renders factual composition for fully assigned week", () => {
    const { container } = render(
      <CoverageDetailsDrawer
        open
        onOpenChange={vi.fn()}
        staffCount={5}
        openShiftCount={0}
        conflictCount={0}
        plannedShiftCount={5}
        assignedShiftCount={5}
        roleCoverage={[{ label: "Chef", value: "5 of 5 assigned", tone: "info" }]}
      />,
    );

    expect(screen.getAllByText("5 of 5 assigned").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("All shifts assigned")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/%/);
    expect(container.querySelector("[style*='width']")).not.toBeInTheDocument();
  });

  it("renders 'No shifts planned' for empty week", () => {
    const { container } = render(
      <CoverageDetailsDrawer
        open
        onOpenChange={vi.fn()}
        staffCount={5}
        openShiftCount={0}
        conflictCount={0}
        plannedShiftCount={0}
        assignedShiftCount={0}
        roleCoverage={[{ label: "Chef", value: "No shifts planned", tone: "info" }]}
      />,
    );

    expect(screen.getAllByText("No shifts planned").length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).not.toMatch(/%/);
    expect(container.querySelector("[style*='width']")).not.toBeInTheDocument();
  });
});
