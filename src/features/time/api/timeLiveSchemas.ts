import { z } from "zod";

export const workspaceInput = z.object({ workspaceId: z.string().uuid() });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const timeRangeInput = z
  .object({
    workspaceId: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    staffMemberId: z.string().uuid().optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be on or before endDate",
    path: ["endDate"],
  });

export const timeEntryReviewInput = z.object({
  workspaceId: z.string().uuid(),
  timeEntryId: z.string().uuid(),
});

export const pendingTimePreviewInput = z.object({
  workspaceId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const timeOperationalCountsInput = z
  .object({ workspaceId: z.string().uuid(), startDate: isoDate, endDate: isoDate })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be on or before endDate",
    path: ["endDate"],
  });

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

const exportScope = z.object({
  startDate: isoDate,
  endDate: isoDate,
  departmentId: z.string().uuid().optional(),
});

const datesInOrder = (value: { startDate: string; endDate: string }) =>
  value.startDate <= value.endDate;
const datesInOrderMessage = {
  message: "startDate must be on or before endDate",
  path: ["endDate"] as (string | number)[],
};

/** Preview scope. Writes no audit event — opening a dialog is not an export. */
export const exportInput = exportScope.refine(datesInOrder, datesInOrderMessage);

/**
 * Download scope. Carries the signature of the preview the manager actually
 * reviewed; the database refuses to audit or return anything if it no longer
 * matches the current data.
 */
export const exportDownloadInput = exportScope
  .extend({ expectedSignature: z.string().min(1).max(64) })
  .refine(datesInOrder, datesInOrderMessage);

export type TimeWriteResult = { ok: true } | { ok: false; message: string };

export type ExportRow = {
  staffMemberId: string;
  displayName: string;
  roleName: string;
  departmentName: string;
  entryCount: number;
  approvedHours: number;
};

/** Preview adds the signature the download must present back. */
export type ExportPreviewResult =
  | { ok: true; rows: ExportRow[]; previewSignature: string }
  | { ok: false; message: string; referenceId?: string };

/**
 * `staleSignature` means the approved hours changed after the preview: nothing
 * was audited and nothing was downloaded, and the manager must review a fresh
 * preview and confirm again.
 */
export type ExportDownloadResult =
  | { ok: true; rows: ExportRow[] }
  | { ok: false; message: string; referenceId?: string; staleSignature?: boolean };
