import { describe, expect, it, vi } from "vitest";
import { submitEditStaff } from "./editStaffSubmission";

const ok = async () => ({ ok: true }) as const;
const fails = (message: string) => async () => ({ ok: false, message }) as const;

describe("submitEditStaff", () => {
  it("reports both halves saved when both succeed", async () => {
    await expect(
      submitEditStaff({ detailsAlreadySaved: false, saveDetails: ok, savePayRate: ok }),
    ).resolves.toEqual({ details: "saved", pay: "saved", detailsError: null, payError: null });
  });

  /**
   * The defect: a pay-rate failure used to be reported through the same single
   * error slot as the details write, so a manager whose details had already
   * saved was told the whole edit failed.
   */
  it("keeps a successful details save when the pay rate fails", async () => {
    const outcome = await submitEditStaff({
      detailsAlreadySaved: false,
      saveDetails: ok,
      savePayRate: fails("The hourly rate didn't save. Try again."),
    });

    expect(outcome.details).toBe("saved");
    expect(outcome.detailsError).toBeNull();
    expect(outcome.pay).toBe("failed");
    expect(outcome.payError).toBe("The hourly rate didn't save. Try again.");
  });

  it("does not attempt the pay rate when the details fail", async () => {
    const savePayRate = vi.fn();

    const outcome = await submitEditStaff({
      detailsAlreadySaved: false,
      saveDetails: fails("Check the values and try again."),
      savePayRate,
    });

    expect(outcome).toEqual({
      details: "failed",
      pay: "skipped",
      detailsError: "Check the values and try again.",
      payError: null,
    });
    expect(savePayRate).not.toHaveBeenCalled();
  });

  it("retries only the pay rate once the details are already saved", async () => {
    const saveDetails = vi.fn();
    const savePayRate = vi.fn(ok);

    const outcome = await submitEditStaff({
      detailsAlreadySaved: true,
      saveDetails,
      savePayRate,
    });

    expect(saveDetails).not.toHaveBeenCalled();
    expect(savePayRate).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({
      details: "skipped",
      pay: "saved",
      detailsError: null,
      payError: null,
    });
  });

  it("turns a thrown details write into a details failure, not a crash", async () => {
    const outcome = await submitEditStaff({
      detailsAlreadySaved: false,
      saveDetails: async () => {
        throw new Error("network down");
      },
      savePayRate: ok,
    });

    expect(outcome.details).toBe("failed");
    expect(outcome.detailsError).toBeTruthy();
    expect(outcome.payError).toBeNull();
  });

  it("turns a thrown pay write into a pay-only failure", async () => {
    const outcome = await submitEditStaff({
      detailsAlreadySaved: false,
      saveDetails: ok,
      savePayRate: async () => {
        throw new Error("network down");
      },
    });

    expect(outcome.details).toBe("saved");
    expect(outcome.detailsError).toBeNull();
    expect(outcome.pay).toBe("failed");
    expect(outcome.payError).toBeTruthy();
  });
});
