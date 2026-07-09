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
});

export const shiftIdInput = z.object({ shiftId: z.string().uuid() });

export const updateShiftInput = shiftIdInput.extend({
  patch: z
    .object({
      staffId: z.string().uuid().nullable().optional(),
      role: z.string().trim().min(1).max(120).optional(),
      start: timeSchema.optional(),
      end: timeSchema.optional(),
      breakMinutes: z.number().int().min(0).max(1440).optional(),
      // Manager grid overrides; null clears them back to the role default.
      colourOverride: z.string().trim().max(30).nullable().optional(),
      deptOverride: z.string().trim().min(1).max(120).nullable().optional(),
    })
    .refine((patch) => Object.keys(patch).length > 0, "At least one shift field is required"),
});
