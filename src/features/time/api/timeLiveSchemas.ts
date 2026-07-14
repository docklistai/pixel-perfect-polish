import { z } from "zod";

export const workspaceInput = z.object({ workspaceId: z.string().uuid() });

export const approveInput = z.object({
  workspaceId: z.string().uuid(),
  timeEntryIds: z.array(z.string().uuid()).min(1),
  approvalStatus: z.enum(["approved", "rejected", "pending"]),
  reason: z.string().trim().max(2000).optional(),
});

export const adjustInput = z.object({
  workspaceId: z.string().uuid(),
  timeEntryId: z.string().uuid(),
  clockedInAt: z.string().datetime().nullable(),
  clockedOutAt: z.string().datetime().nullable(),
  breakMinutes: z.number().int().min(0).max(1440),
  reason: z.string().trim().min(1).max(2000),
});

export const exportInput = z.object({
  workspaceId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TimeWriteResult = { ok: true } | { ok: false; message: string };

export type ExportRow = {
  staffMemberId: string;
  displayName: string;
  roleName: string;
  departmentName: string;
  entryCount: number;
  approvedHours: number;
};

export type ExportResult = { ok: true; rows: ExportRow[] } | { ok: false; message: string };
