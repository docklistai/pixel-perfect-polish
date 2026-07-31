import { describe, expect, it, vi } from "vitest";
import { buildGuardedRotaController } from "./useGuardedRotaController";

type RotaController = Parameters<typeof buildGuardedRotaController>[0];

const MUTATING_METHODS = [
  "addShift",
  "duplicateShiftAsOpen",
  "duplicateShiftToNextDay",
  "removeShiftNow",
  "restoreShift",
  "updateShift",
  "previewCopyPreviousWeek",
  "copyPreviousWeek",
  "requestCopyPreviousWeek",
  "handlePublish",
  "requestRemoveShift",
  "requestClearWeek",
  "confirmPendingAction",
  "markShiftOpen",
] as const;

function getMockController(): RotaController {
  const methods = Object.fromEntries(MUTATING_METHODS.map((name) => [name, vi.fn()]));
  return {
    ...methods,
    confirmation: { kind: "remove" },
    weekLabel: "Week of 6 Jul",
    setSelectedShiftId: vi.fn(),
  } as unknown as RotaController;
}

describe("buildGuardedRotaController", () => {
  it("returns the controller unchanged when editing is allowed", () => {
    const rota = getMockController();
    const onBlocked = vi.fn();

    expect(buildGuardedRotaController(rota, false, onBlocked)).toBe(rota);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("routes every mutating method to onBlocked in read-only mode", async () => {
    const rota = getMockController();
    const onBlocked = vi.fn();
    const guarded = buildGuardedRotaController(rota, true, onBlocked);

    for (const name of MUTATING_METHODS) {
      const result = (guarded[name] as () => unknown)();
      if (result instanceof Promise) {
        await result.catch(() => undefined);
      }
    }

    expect(onBlocked).toHaveBeenCalledTimes(MUTATING_METHODS.length);
    for (const name of MUTATING_METHODS) {
      expect(rota[name], `${name} must not reach the real controller`).not.toHaveBeenCalled();
    }
  });

  it("preserves the blocked return contracts used by the grid and overlays", async () => {
    const rota = getMockController();
    const guarded = buildGuardedRotaController(rota, true, vi.fn());

    expect(guarded.confirmation).toBeNull();
    expect((guarded.duplicateShiftToNextDay as (id: string) => unknown)("shift-1")).toBeNull();
    await expect((guarded.previewCopyPreviousWeek as () => Promise<unknown>)()).rejects.toThrow(
      "Live rota is unavailable.",
    );
  });

  it("passes non-mutating fields through untouched in read-only mode", () => {
    const rota = getMockController();
    const guarded = buildGuardedRotaController(rota, true, vi.fn());

    expect(guarded.weekLabel).toBe(rota.weekLabel);
    expect(guarded.setSelectedShiftId).toBe(rota.setSelectedShiftId);
  });
});
