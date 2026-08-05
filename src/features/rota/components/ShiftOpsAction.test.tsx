import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShiftOpsAction } from "./ShiftOpsAction";
import type { DraftShift } from "../types";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));

const shift = {
  id: "11111111-1111-4111-8111-111111111111",
  staffId: "22222222-2222-4222-8222-222222222222",
  departmentId: "33333333-3333-4333-8333-333333333333",
} as DraftShift;

describe("Rota to Ops prefill", () => {
  it("carries the exact shift context into the Ops create route", async () => {
    const user = userEvent.setup();
    navigate.mockClear();
    render(
      <ShiftOpsAction
        shift={shift}
        rotaWeekId="44444444-4444-4444-8444-444444444444"
        locationId="55555555-5555-4555-8555-555555555555"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Log Ops item" }));
    expect(navigate).toHaveBeenCalledWith({
      to: "/ops",
      search: {
        create: true,
        locationId: "55555555-5555-4555-8555-555555555555",
        rotaWeekId: "44444444-4444-4444-8444-444444444444",
        shiftId: "11111111-1111-4111-8111-111111111111",
        staffMemberId: "22222222-2222-4222-8222-222222222222",
        departmentId: "33333333-3333-4333-8333-333333333333",
      },
    });
  });

  it("offers no Ops prefill when the shift has no week or location to carry", () => {
    const { container } = render(
      <ShiftOpsAction shift={shift} rotaWeekId={null} locationId={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps timeline row actions reachable on mobile", () => {
    // Only the priority badge and actor name collapse on small screens; the row's
    // primary control and its action menu must never be viewport-gated.
    const source = readFileSync("src/features/ops/components/OpsTimelineEntry.tsx", "utf8");
    const hiddenLines = source
      .split("\n")
      .filter((line) => line.includes("hidden") && !line.includes("aria-hidden"));
    expect(hiddenLines).toHaveLength(2);
    for (const line of hiddenLines) expect(line).toMatch(/StatusBadge|actorName/);
    for (const line of source.split("\n"))
      if (line.includes("RowActionMenu")) expect(line).not.toContain("hidden");
  });
});
