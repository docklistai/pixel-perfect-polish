import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callTeamRpc } from "./teamServerRpc";

const uuid = z.string().uuid();
const request = z.object({ requestId: uuid });
const audienceKind = z.enum(["all_staff", "department", "managers"]);

/**
 * Audience is a KIND plus at most one department — never a recipient list. The
 * server expands it, so a caller cannot broaden its own fan-out.
 */
const audience = {
  audienceKind,
  audienceDepartmentId: uuid.nullable().optional(),
};

export const createTeamAnnouncementFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({
        ...audience,
        title: z.string().trim().min(1).max(200),
        body: z.string().trim().min(1).max(4000),
        pinned: z.boolean(),
        requiresAcknowledgement: z.boolean(),
        highlightInUpdates: z.boolean(),
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callTeamRpc("rpc_team_create_announcement", {
      p_request_id: data.requestId,
      p_title: data.title,
      p_body: data.body,
      p_audience_kind: data.audienceKind,
      p_audience_department_id: data.audienceDepartmentId ?? null,
      p_pinned: data.pinned,
      p_requires_acknowledgement: data.requiresAcknowledgement,
      p_highlight_in_updates: data.highlightInUpdates,
    }),
  );

export const addTeamAnnouncementCommentFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request.extend({ announcementId: uuid, body: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(({ data }) =>
    callTeamRpc("rpc_team_add_announcement_comment", {
      p_request_id: data.requestId,
      p_announcement_id: data.announcementId,
      p_body: data.body,
    }),
  );

export const remindTeamNonReadersFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ announcementId: uuid }).parse(input))
  .handler(({ data }) =>
    callTeamRpc("rpc_team_remind_announcement_non_readers", {
      p_request_id: data.requestId,
      p_announcement_id: data.announcementId,
    }),
  );

export const acknowledgeTeamAnnouncementFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ announcementId: uuid }).parse(input))
  .handler(({ data }) =>
    callTeamRpc("rpc_team_acknowledge_announcement", {
      p_request_id: data.requestId,
      p_announcement_id: data.announcementId,
    }),
  );

export const createTeamTrainingReminderFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({
        ...audience,
        title: z.string().trim().min(1).max(200),
        source: z.enum(["manager_reminder", "staff_records"]),
        dueAt: z.string().min(1),
        mandatory: z.boolean(),
      })
      .parse(input),
  )
  .handler(({ data }) =>
    callTeamRpc("rpc_team_create_training_reminder", {
      p_request_id: data.requestId,
      p_title: data.title,
      p_source: data.source,
      p_audience_kind: data.audienceKind,
      p_audience_department_id: data.audienceDepartmentId ?? null,
      p_due_at: data.dueAt,
      p_mandatory: data.mandatory,
    }),
  );

export const recordTeamTrainingCompletionFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request.extend({ reminderId: uuid, staffMemberId: uuid }).parse(input),
  )
  .handler(({ data }) =>
    callTeamRpc("rpc_team_record_training_completion", {
      p_request_id: data.requestId,
      p_reminder_id: data.reminderId,
      p_staff_member_id: data.staffMemberId,
    }),
  );

export const sendTeamTrainingReminderFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => request.extend({ reminderId: uuid }).parse(input))
  .handler(({ data }) =>
    callTeamRpc("rpc_team_send_training_reminder", {
      p_request_id: data.requestId,
      p_reminder_id: data.reminderId,
    }),
  );

export const setTeamTrainingNoteFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request.extend({ reminderId: uuid, note: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(({ data }) =>
    callTeamRpc("rpc_team_set_training_note", {
      p_request_id: data.requestId,
      p_reminder_id: data.reminderId,
      p_note: data.note,
    }),
  );

export const createTeamStaffEventFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({ title: z.string().trim().min(1).max(200), occursAt: z.string().min(1) })
      .parse(input),
  )
  .handler(({ data }) =>
    callTeamRpc("rpc_team_create_staff_event", {
      p_request_id: data.requestId,
      p_title: data.title,
      p_occurs_at: data.occursAt,
    }),
  );

export const acknowledgeTeamBirthdayFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    request
      .extend({ staffMemberId: uuid, birthdayYear: z.number().int().min(2000).max(2200) })
      .parse(input),
  )
  .handler(({ data }) =>
    callTeamRpc("rpc_team_acknowledge_birthday", {
      p_request_id: data.requestId,
      p_staff_member_id: data.staffMemberId,
      p_birthday_year: data.birthdayYear,
    }),
  );
