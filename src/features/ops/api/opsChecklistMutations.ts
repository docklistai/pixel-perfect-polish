import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callOpsRpc } from "./opsServerRpc";

const uuid = z.string().uuid();
const nullableUuid = uuid.nullable().optional();
const request = z.object({ requestId: uuid });

export const createOpsChecklistTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({
        name: z.string().trim().min(1).max(160),
        locationId: nullableUuid,
        departmentId: nullableUuid,
        shiftType: z
          .enum(["opening", "day", "closing", "overnight", "other"])
          .nullable()
          .optional(),
        daypart: z.enum(["morning", "afternoon", "evening", "overnight"]).nullable().optional(),
        items: z
          .array(z.object({ label: z.string().trim().min(1).max(300), requiresNote: z.boolean() }))
          .min(1)
          .max(100),
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_create_checklist_template", {
      p_request_id: data.requestId,
      p_name: data.name,
      p_location_id: data.locationId ?? null,
      p_department_id: data.departmentId ?? null,
      p_shift_type: data.shiftType ?? null,
      p_daypart: data.daypart ?? null,
      p_item_labels: data.items.map((item) => item.label),
      p_item_requires_note: data.items.map((item) => item.requiresNote),
    }),
  );

export const setOpsChecklistTemplateActiveFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request.extend({ templateId: uuid, active: z.boolean() }).parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_set_checklist_template_active", {
      p_request_id: data.requestId,
      p_template_id: data.templateId,
      p_active: data.active,
    }),
  );

export const startOpsChecklistRunFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({
        templateId: uuid,
        locationId: uuid,
        runDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        assignedStaffMemberId: nullableUuid,
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_start_checklist_run", {
      p_request_id: data.requestId,
      p_template_id: data.templateId,
      p_location_id: data.locationId,
      p_run_date: data.runDate,
      p_assigned_staff_member_id: data.assignedStaffMemberId ?? null,
    }),
  );

export const setOpsChecklistRunItemFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({
        runItemId: uuid,
        state: z.enum(["pending", "done", "exception"]),
        note: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_set_checklist_run_item", {
      p_request_id: data.requestId,
      p_run_item_id: data.runItemId,
      p_state: data.state,
      p_note: data.note ?? null,
    }),
  );

export const reviewOpsChecklistRunFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ runId: uuid }).parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_review_checklist_run", {
      p_request_id: data.requestId,
      p_run_id: data.runId,
    }),
  );
