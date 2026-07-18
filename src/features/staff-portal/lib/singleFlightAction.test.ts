import { describe, expect, it, vi } from "vitest";
import { createSingleFlightAction } from "./singleFlightAction";

describe("createSingleFlightAction", () => {
  it("drops a rapid second submission while the first is pending", async () => {
    let release: (() => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const gate = createSingleFlightAction();

    const first = gate.run(action);
    const second = gate.run(action);

    expect(action).toHaveBeenCalledTimes(1);
    expect(await second).toBe(false);
    release?.();
    expect(await first).toBe(true);
  });

  it("opens again after a failed action so the user can retry", async () => {
    const gate = createSingleFlightAction();
    await expect(gate.run(() => Promise.reject(new Error("network")))).rejects.toThrow("network");
    await expect(gate.run(() => Promise.resolve())).resolves.toBe(true);
  });
});
