import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callOpsRpc } from "./opsServerRpc";

const uuid = z.string().uuid();
const nullableUuid = uuid.nullable().optional();
const request = z.object({ requestId: uuid });
const entryType = z.enum(["task", "incident", "maintenance", "service_request", "note"]);
const priority = z.enum(["low", "normal", "high", "critical"]);
const severity = z.enum(["low", "medium", "high", "critical"]);
const createInput = request.extend({
  entryType,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  locationId: uuid,
  area: z.string().trim().max(120).nullable().optional(),
  departmentId: nullableUuid,
  rotaWeekId: nullableUuid,
  shiftId: nullableUuid,
  subjectStaffMemberId: nullableUuid,
  leaveRequestId: nullableUuid,
  assignedStaffMemberId: nullableUuid,
  dueAt: z.string().datetime().nullable().optional(),
  priority,
  severity: severity.nullable().optional(),
  occurredAt: z.string().datetime().nullable().optional(),
  immediateAction: z.string().trim().max(2000).nullable().optional(),
  parentEntryId: nullableUuid,
  createFollowUp: z.boolean().default(false),
});
const updateInput = createInput
  .omit({
    entryType: true,
    locationId: true,
    occurredAt: true,
    parentEntryId: true,
    createFollowUp: true,
  })
  .extend({ entryId: uuid });
const entryRequest = request.extend({ entryId: uuid });

export type CreateOpsEntryInput = z.infer<typeof createInput>;
export type UpdateOpsEntryInput = z.infer<typeof updateInput>;
export type OpsEntryDraft = Omit<CreateOpsEntryInput, "requestId" | "createFollowUp">;

export const createOpsEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_create_entry", {
      p_request_id: data.requestId,
      p_entry_type: data.entryType,
      p_title: data.title,
      p_description: data.description ?? null,
      p_location_id: data.locationId,
      p_area_label: data.area ?? null,
      p_department_id: data.departmentId ?? null,
      p_rota_week_id: data.rotaWeekId ?? null,
      p_shift_id: data.shiftId ?? null,
      p_subject_staff_member_id: data.subjectStaffMemberId ?? null,
      p_leave_request_id: data.leaveRequestId ?? null,
      p_assigned_staff_member_id: data.assignedStaffMemberId ?? null,
      p_due_at: data.dueAt ?? null,
      p_priority: data.priority,
      p_severity: data.severity ?? null,
      p_occurred_at: data.occurredAt ?? null,
      p_immediate_action: data.immediateAction ?? null,
      p_parent_entry_id: data.parentEntryId ?? null,
      p_create_follow_up: data.createFollowUp,
    }),
  );

export const updateOpsEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_update_entry", {
      p_request_id: data.requestId,
      p_entry_id: data.entryId,
      p_title: data.title,
      p_description: data.description ?? null,
      p_area_label: data.area ?? null,
      p_department_id: data.departmentId ?? null,
      p_rota_week_id: data.rotaWeekId ?? null,
      p_shift_id: data.shiftId ?? null,
      p_subject_staff_member_id: data.subjectStaffMemberId ?? null,
      p_leave_request_id: data.leaveRequestId ?? null,
      p_assigned_staff_member_id: data.assignedStaffMemberId ?? null,
      p_due_at: data.dueAt ?? null,
      p_priority: data.priority,
      p_severity: data.severity ?? null,
      p_immediate_action: data.immediateAction ?? null,
    }),
  );

export const setOpsEntryStatusFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    entryRequest
      .extend({
        status: z.enum(["open", "in_progress", "resolved"]),
        resolutionNote: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_set_entry_status", {
      p_request_id: data.requestId,
      p_entry_id: data.entryId,
      p_status: data.status,
      p_resolution_note: data.resolutionNote ?? null,
    }),
  );

export const assignOpsEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    entryRequest.extend({ staffMemberId: nullableUuid }).parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_assign_entry", {
      p_request_id: data.requestId,
      p_entry_id: data.entryId,
      p_staff_member_id: data.staffMemberId ?? null,
    }),
  );

export const pinOpsEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entryRequest.extend({ pinned: z.boolean() }).parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_pin_entry", {
      p_request_id: data.requestId,
      p_entry_id: data.entryId,
      p_pinned: data.pinned,
    }),
  );

export const archiveOpsEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    entryRequest.extend({ reason: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_archive_entry", {
      p_request_id: data.requestId,
      p_entry_id: data.entryId,
      p_reason: data.reason,
    }),
  );

export const addOpsEntryNoteFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    entryRequest.extend({ note: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_add_entry_note", {
      p_request_id: data.requestId,
      p_entry_id: data.entryId,
      p_note: data.note,
    }),
  );

export const exportOpsEntriesFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ locationId: nullableUuid }).parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_export_entries", {
      p_request_id: data.requestId,
      p_location_id: data.locationId ?? null,
    }),
  );
