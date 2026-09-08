import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BuildWeekColdStartStep } from "./BuildWeekColdStartStep";
import { BuildWeekStepActions } from "./BuildWeekStepActions";

const noop = () => {};

function stepActions(overrides: Partial<Parameters<typeof BuildWeekStepActions>[0]> = {}) {
  return (
    <BuildWeekStepActions
      step="source"
      canEdit
      coldStart
      hasSource={false}
      hasProposal={false}
      operationCount={0}
      loading={false}
      applying={false}
      onCancel={noop}
      onStepChange={noop}
      onBuildProposal={noop}
      onChangeSource={noop}
      onApply={noop}
      {...overrides}
    />
  );
}

describe("Build the Week cold start", () => {
  it("says what is missing rather than offering choices that cannot be taken", () => {
    render(<BuildWeekColdStartStep weekLabel="w/c 24 Aug" onSketchOpenShifts={noop} />);

    expect(screen.getByText("No staffing pattern yet")).toBeInTheDocument();
    expect(screen.getByText(/w\/c 24 Aug has no shifts/)).toBeInTheDocument();
    expect(screen.getByText(/no saved template/)).toBeInTheDocument();
  });

  it("explains why Docklist cannot answer the question yet", () => {
    render(<BuildWeekColdStartStep weekLabel="w/c 24 Aug" onSketchOpenShifts={noop} />);

    expect(screen.getByText(/cannot know how many people this venue needs/i)).toBeInTheDocument();
  });

  it("asks for coverage, not for a hand-built rota", () => {
    render(<BuildWeekColdStartStep weekLabel="w/c 24 Aug" onSketchOpenShifts={noop} />);

    expect(screen.getByText(/leave them/i)).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(
      screen.getByText(/You never have to assign the first week by hand/i),
    ).toBeInTheDocument();
  });

  it("hands the manager to the existing Open-shift creation flow", async () => {
    const onSketchOpenShifts = vi.fn();
    render(
      <BuildWeekColdStartStep weekLabel="w/c 24 Aug" onSketchOpenShifts={onSketchOpenShifts} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /sketch open shifts/i }));

    expect(onSketchOpenShifts).toHaveBeenCalledTimes(1);
  });

  it("offers no action at all when the manager cannot edit this week", () => {
    render(<BuildWeekColdStartStep weekLabel="w/c 24 Aug" />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("points at the templates step as the follow-on, without doing it here", () => {
    render(<BuildWeekColdStartStep weekLabel="w/c 24 Aug" onSketchOpenShifts={noop} />);

    expect(screen.getByText(/Save the shape/i)).toBeInTheDocument();
    // No name entry, no save control — templates stay the templates drawer's job.
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("cold start offers no way to run the scheduler", () => {
  it("hides Build a proposal while there is no demand source", () => {
    render(stepActions());

    expect(screen.queryByRole("button", { name: /build a proposal/i })).toBeNull();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("offers nothing that could write to the week", () => {
    render(stepActions());

    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /import/i })).toBeNull();
  });

  it("restores Build a proposal as soon as a source exists", () => {
    render(stepActions({ coldStart: false, hasSource: true }));

    const build = screen.getByRole("button", { name: /build a proposal/i });
    expect(build).toBeInTheDocument();
    expect(build).toBeEnabled();
  });

  it("keeps the existing disabled-until-chosen rule outside a cold start", () => {
    render(stepActions({ coldStart: false, hasSource: false }));

    expect(screen.getByRole("button", { name: /build a proposal/i })).toBeDisabled();
  });

  it("leaves the review step's apply rules untouched", () => {
    render(
      stepActions({
        step: "review",
        coldStart: false,
        hasProposal: true,
        operationCount: 3,
      }),
    );

    expect(screen.getByRole("button", { name: /apply to this week/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /change source/i })).toBeInTheDocument();
  });

  it("still refuses an empty proposal on review", () => {
    render(stepActions({ step: "review", coldStart: false, hasProposal: true, operationCount: 0 }));

    expect(screen.getByRole("button", { name: /apply to this week/i })).toBeDisabled();
  });
});
