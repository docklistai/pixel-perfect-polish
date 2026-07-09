import type { PortalShift } from "../types";

export type PortalPayEstimate = {
  /** Paid hours (breaks deducted) across the window. */
  hours: number;
  amountPence: number;
  shiftCount: number;
};

/**
 * Rough gross pay for published shifts in [fromIsoDate, toIsoDate]. Breaks are
 * treated as unpaid. This is an estimate before tax and any premiums — the
 * portal labels it as such.
 */
export function estimatePortalPay(
  shifts: PortalShift[],
  ratePence: number,
  fromIsoDate: string,
  toIsoDate: string,
): PortalPayEstimate {
  let hours = 0;
  let shiftCount = 0;
  for (const shift of shifts) {
    if (shift.date < fromIsoDate || shift.date > toIsoDate) continue;
    hours += Math.max(0, shift.hours - (shift.breakMinutes ?? 0) / 60);
    shiftCount += 1;
  }
  return { hours, amountPence: Math.round(hours * ratePence), shiftCount };
}

export function formatEstimateAmount(pence: number): string {
  const pounds = pence / 100;
  return `£${pounds.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
