import { demoPublishedRotaSnapshot } from "@/features/rota/data/publishedRotaSnapshot";
import type { PublishedRotaSnapshot, PublishedShiftSnapshot } from "@/features/rota/types";
import { shiftHours } from "@/features/rota/lib/draftRota";
import { mockProfile } from "./mockPortalData";
import type { PortalShift, ShiftStatus } from "../types";

function portalStatus(status: PublishedShiftSnapshot["status"]): ShiftStatus {
  return status === "changed" ? "changed" : "confirmed";
}

export function mapPublishedSnapshotToPortalShifts(
  snapshot: PublishedRotaSnapshot | null,
  staffId: string,
): PortalShift[] {
  if (!snapshot) return [];

  return snapshot.shifts
    .filter((shift) => shift.staffId === staffId)
    .map((shift) => ({
      id: shift.id,
      date: shift.date,
      dayLabel: shift.dayLabel,
      start: shift.start,
      end: shift.end,
      hours: shiftHours(shift.start, shift.end),
      role: shift.role,
      station: shift.location,
      breakMinutes: shift.breakMinutes,
      status: portalStatus(shift.status),
      sourceSnapshotVersion: snapshot.version,
      publishedAt: snapshot.publishedAt,
    }))
    .sort((a, b) => `${a.date}-${a.start}`.localeCompare(`${b.date}-${b.start}`));
}

export const portalPublishedRotaSnapshot = demoPublishedRotaSnapshot;

export const portalPublishedWeekShifts = mapPublishedSnapshotToPortalShifts(
  portalPublishedRotaSnapshot,
  mockProfile.staffId,
);

export const portalPublishedNextShift = portalPublishedWeekShifts[0] ?? null;
