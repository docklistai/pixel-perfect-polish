import { z } from "zod";

export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const liveWeekInput = z.object({
  weekOffset: z.number().int().min(-260).max(260),
  locationId: z.string().uuid().optional(),
});

export const draftShiftInput = z.object({
  dayIndex: z.number().int().min(0).max(6),
  staffId: z.string().uuid().nullable(),
  role: z.string().trim().min(1).max(120),
  start: timeSchema,
  end: timeSchema,
  breakMinutes: z.number().int().min(0).max(1440).optional(),
  status: z.enum(["scheduled", "open", "conflict"]).optional(),
  // Explicit shift department. The server still verifies it belongs to this
  // workspace and is active — a well-formed uuid alone is never trusted.
  departmentId: z.string().uuid().nullish(),
  // Manager grid overrides. Accepted on create so recreating a removed shift
  // restores exactly what was on screen, not a stripped-down copy of it.
  colourOverride: z.string().trim().max(30).nullish(),
  deptOverride: z.string().trim().min(1).max(120).nullish(),
});

export const shiftIdInput = z.object({ shiftId: z.string().uuid() });

export const liveRotaShiftMutationResult = z
  .object({
    rotaWeekId: z.string().uuid(),
    shiftId: z.string().uuid(),
  })
  .strict();

export const liveRotaRemoveMutationResult = z
  .object({
    rotaWeekId: z.string().uuid(),
  })
  .strict();

export const updateShiftInput = shiftIdInput.extend({
  patch: z
    .object({
      staffId: z.string().uuid().nullable().optional(),
      // Moving the shift to another day of its OWN rota week. The client sends
      // an index, never a date: the calendar date is derived server-side from
      // the week's stored `week_start`, so a client can neither move a shift
      // out of its week nor smuggle in a date from another one. Bounded 0–6
      // because `guard_shift_write` refuses anything outside `week_start + 6`.
      dayIndex: z.number().int().min(0).max(6).optional(),
      role: z.string().trim().min(1).max(120).optional(),
      start: timeSchema.optional(),
      end: timeSchema.optional(),
      breakMinutes: z.number().int().min(0).max(1440).optional(),
      // Moving a shift between departments. Verified server-side against the
      // caller's workspace; it never edits the staff member's own department.
      departmentId: z.string().uuid().optional(),
      // Manager grid overrides; null clears them back to the role default.
      colourOverride: z.string().trim().max(30).nullable().optional(),
      deptOverride: z.string().trim().min(1).max(120).nullable().optional(),
    })
    .refine((patch) => Object.keys(patch).length > 0, "At least one shift field is required"),
});
