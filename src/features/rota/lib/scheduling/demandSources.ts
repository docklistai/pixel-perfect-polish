import {
  buildShiftSignature,
  countBySignature,
  signatureKey,
  type ShiftSignature,
} from "./shiftSignature";
import type { DemandRequirement, ExistingShiftFact } from "./buildWeekProposal";

/**
 * The three ways a manager can say what the week needs.
 *
 * Every source produces the same thing — counted normalized signatures — so the
 * planner has exactly one notion of demand regardless of where it came from. What
 * differs is only how each source is read.
 *
 * All three deliberately produce **demand, not assignments**. Who works a shift is
 * the planner's decision, made against this week's leave and availability; carrying
 * last week's assignments forward would schedule people against facts that have
 * since changed. Exact Copy Previous Week remains a separate action for managers
 * who genuinely want the rota duplicated as-is.
 */

/** A saved template slot, already server-side in `rota_demand_template_slots`. */
export type TemplateSlot = {
  /** 0 = Monday .. 6 = Sunday, matching the stored column. */
  weekday: number;
  roleName: string;
  departmentId: string;
  startLocal: string;
  endLocal: string;
  breakMinutes: number;
  quantity: number;
};

/** A shift from the previous week, reduced to shape. Assignment is discarded. */
export type PreviousWeekShift = {
  /** 0..6 offset within the source week. */
  dayOffset: number;
  roleName: string;
  departmentId: string;
  startLocal: string;
  endLocal: string;
  breakMinutes: number;
};

function signatureFor(
  dayOffset: number,
  parts: {
    roleName: string;
    departmentId: string;
    startLocal: string;
    endLocal: string;
    breakMinutes: number;
  },
  dayIsoDates: readonly string[],
  locationId: string,
): ShiftSignature | null {
  const workDate = dayIsoDates[dayOffset];
  if (workDate === undefined) return null;
  return buildShiftSignature({
    workDate,
    start: parts.startLocal,
    end: parts.endLocal,
    role: parts.roleName,
    departmentId: parts.departmentId,
    locationId,
    breakMinutes: parts.breakMinutes,
  });
}

/**
 * A saved demand template. Quantities are the template's own, so a slot asking
 * for three Saturday closes produces a requirement of three.
 */
export function demandFromTemplate(
  slots: readonly TemplateSlot[],
  dayIsoDates: readonly string[],
  locationId: string,
): DemandRequirement[] {
  const requirements: DemandRequirement[] = [];
  for (const slot of slots) {
    const signature = signatureFor(slot.weekday, slot, dayIsoDates, locationId);
    // A slot outside the target week has nowhere to land. Skipping it silently
    // would be data loss, so the caller is expected to have validated weekday
    // range already; this guard only prevents an undefined date.
    if (!signature) continue;
    requirements.push({ signature, required: slot.quantity, roleName: slot.roleName });
  }
  return mergeRequirements(requirements);
}

/**
 * Last week's staffing pattern, as demand only.
 *
 * Identical shifts collapse into a count rather than separate requirements, which
 * is exactly the multiset behaviour: four identical Friday shifts last week means
 * this week needs four, not one.
 */
export function demandFromPreviousWeek(
  shifts: readonly PreviousWeekShift[],
  dayIsoDates: readonly string[],
  locationId: string,
): DemandRequirement[] {
  const seen: { signature: ShiftSignature; roleName: string }[] = [];
  for (const shift of shifts) {
    const signature = signatureFor(shift.dayOffset, shift, dayIsoDates, locationId);
    if (!signature) continue;
    seen.push({ signature, roleName: shift.roleName });
  }
  const roleNameByKey = new Map(
    seen.map((entry) => [signatureKey(entry.signature), entry.roleName]),
  );
  return [...countBySignature(seen, (entry) => entry.signature).values()].map((bucket) => ({
    signature: bucket.signature,
    required: bucket.count,
    roleName: roleNameByKey.get(signatureKey(bucket.signature)) ?? bucket.signature.roleKey,
  }));
}

/**
 * The week's own existing shifts as demand.
 *
 * This produces a proposal that creates nothing — every requirement is already
 * met by definition — and exists so a manager can run the assignment pass over
 * the week they have already built, without changing its shape.
 */
export function demandFromCurrentWeek(
  existing: readonly ExistingShiftFact[],
  roleNameById: ReadonlyMap<string, string> = new Map(),
): DemandRequirement[] {
  return [...countBySignature(existing, (shift) => shift.signature).values()].map((bucket) => ({
    signature: bucket.signature,
    required: bucket.count,
    roleName: roleNameById.get(signatureKey(bucket.signature)) ?? bucket.signature.roleKey,
  }));
}

/** Collapses duplicate signatures into one requirement, summing their counts. */
function mergeRequirements(requirements: readonly DemandRequirement[]): DemandRequirement[] {
  const merged = new Map<string, DemandRequirement>();
  for (const requirement of requirements) {
    const key = JSON.stringify([
      requirement.signature.workDate,
      requirement.signature.startLocal,
      requirement.signature.endLocal,
      requirement.signature.overnight,
      requirement.signature.departmentId,
      requirement.signature.locationId,
      requirement.signature.breakMinutes,
      requirement.signature.roleKey,
    ]);
    const current = merged.get(key);
    if (current) current.required += requirement.required;
    else merged.set(key, { ...requirement });
  }
  return [...merged.values()];
}
