import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callOpsRpc } from "./opsServerRpc";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ids = z.array(uuid).max(200);
const request = z.object({ requestId: uuid });

export const createOpsHandoverFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({
        locationId: uuid,
        handoverDate: date,
        rotaWeekId: uuid.nullable().optional(),
        notes: z.string().trim().min(1).max(4000),
        recipientMembershipIds: ids.min(1),
        entryIds: ids,
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_create_handover", {
      p_request_id: data.requestId,
      p_location_id: data.locationId,
      p_handover_date: data.handoverDate,
      p_rota_week_id: data.rotaWeekId ?? null,
      p_notes: data.notes,
      p_recipient_membership_ids: data.recipientMembershipIds,
      p_entry_ids: data.entryIds,
    }),
  );

export const acknowledgeOpsHandoverFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ handoverId: uuid }).parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_acknowledge_handover", {
      p_request_id: data.requestId,
      p_handover_id: data.handoverId,
    }),
  );

export const createOpsBriefingFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({
        locationId: uuid,
        briefingDate: date,
        title: z.string().trim().min(1).max(200),
        summary: z.string().trim().min(1).max(6000),
        recipientMembershipIds: ids.min(1),
        entryIds: ids,
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_create_briefing", {
      p_request_id: data.requestId,
      p_location_id: data.locationId,
      p_briefing_date: data.briefingDate,
      p_title: data.title,
      p_summary: data.summary,
      p_recipient_membership_ids: data.recipientMembershipIds,
      p_entry_ids: data.entryIds,
    }),
  );

export const markOpsBriefingReadFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ briefingId: uuid }).parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_mark_briefing_read", {
      p_request_id: data.requestId,
      p_briefing_id: data.briefingId,
    }),
  );

export const acknowledgeOpsBriefingFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ briefingId: uuid }).parse(input))
  .handler(({ data }) =>
    callOpsRpc("rpc_ops_acknowledge_briefing", {
      p_request_id: data.requestId,
      p_briefing_id: data.briefingId,
    }),
  );
