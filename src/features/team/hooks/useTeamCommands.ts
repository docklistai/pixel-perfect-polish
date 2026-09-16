import * as React from "react";
import {
  acknowledgeTeamAnnouncementFn,
  acknowledgeTeamBirthdayFn,
  addTeamAnnouncementCommentFn,
  createTeamAnnouncementFn,
  createTeamStaffEventFn,
  createTeamTrainingReminderFn,
  recordTeamTrainingCompletionFn,
  remindTeamNonReadersFn,
  sendTeamTrainingReminderFn,
  setTeamTrainingNoteFn,
} from "../api/teamMutations";
import type { ComposeSubmission } from "../components/TeamComposeDrawer";
import type {
  StaffEventSubmission,
  TrainingReminderSubmission,
} from "../components/TeamCreationDrawer";
import type { useTeamActions } from "./useTeamActions";

type Actions = ReturnType<typeof useTeamActions>;

/** Every Team write carries a fresh request id so a double-submit is absorbed. */
const requestId = () => crypto.randomUUID();

export function useTeamCommands(actions: Actions) {
  const { run, runForResult } = actions;

  const publishAnnouncement = React.useCallback(
    async (submission: ComposeSubmission) => {
      const result = await runForResult(
        () => createTeamAnnouncementFn({ data: { requestId: requestId(), ...submission } }),
        "Announcement published.",
      );
      return result !== null;
    },
    [runForResult],
  );

  const addComment = React.useCallback(
    (announcementId: string, body: string) =>
      run(
        () =>
          addTeamAnnouncementCommentFn({ data: { requestId: requestId(), announcementId, body } }),
        "Note added.",
      ),
    [run],
  );

  const remindNonReaders = React.useCallback(
    (announcementId: string) =>
      run(
        () => remindTeamNonReadersFn({ data: { requestId: requestId(), announcementId } }),
        "Reminder sent to everyone who hasn't read it.",
      ),
    [run],
  );

  const acknowledgeAnnouncement = React.useCallback(
    (announcementId: string) =>
      run(
        () => acknowledgeTeamAnnouncementFn({ data: { requestId: requestId(), announcementId } }),
        "Acknowledged.",
      ),
    [run],
  );

  const sendTrainingReminder = React.useCallback(
    (reminderId: string) =>
      run(
        () => sendTeamTrainingReminderFn({ data: { requestId: requestId(), reminderId } }),
        "Training reminder sent.",
      ),
    [run],
  );

  const recordTrainingCompletion = React.useCallback(
    (reminderId: string, staffMemberId: string) =>
      run(
        () =>
          recordTeamTrainingCompletionFn({
            data: { requestId: requestId(), reminderId, staffMemberId },
          }),
        "Marked as done.",
      ),
    [run],
  );

  const saveTrainingNote = React.useCallback(
    (reminderId: string, note: string) =>
      run(
        () => setTeamTrainingNoteFn({ data: { requestId: requestId(), reminderId, note } }),
        "Note saved.",
      ),
    [run],
  );

  const acknowledgeBirthday = React.useCallback(
    (staffMemberId: string, occurrenceYear: number) =>
      run(
        () =>
          acknowledgeTeamBirthdayFn({
            data: {
              requestId: requestId(),
              staffMemberId,
              birthdayYear: occurrenceYear,
            },
          }),
        "Birthday acknowledged.",
      ),
    [run],
  );

  const createTrainingReminder = React.useCallback(
    async (submission: TrainingReminderSubmission) => {
      const result = await runForResult(async () => {
        const createResult = await createTeamTrainingReminderFn({
          data: {
            requestId: requestId(),
            title: submission.title,
            source: "manager_reminder",
            audienceKind: submission.audienceKind,
            audienceDepartmentId: submission.audienceDepartmentId,
            dueAt: submission.dueAt,
            mandatory: submission.mandatory,
          },
        });
        if (createResult.ok && submission.note) {
          const reminderId = (createResult.data as { reminder_id?: string })?.reminder_id;
          if (reminderId) {
            await setTeamTrainingNoteFn({
              data: {
                requestId: requestId(),
                reminderId,
                note: submission.note,
              },
            });
          }
        }
        return createResult;
      }, "Training reminder created.");
      return result !== null;
    },
    [runForResult],
  );

  const createStaffEvent = React.useCallback(
    async (submission: StaffEventSubmission) => {
      const result = await runForResult(
        () =>
          createTeamStaffEventFn({
            data: {
              requestId: requestId(),
              title: submission.title,
              occursAt: submission.occursAt,
            },
          }),
        "Staff event created.",
      );
      return result !== null;
    },
    [runForResult],
  );

  return {
    publishAnnouncement,
    addComment,
    remindNonReaders,
    acknowledgeAnnouncement,
    sendTrainingReminder,
    recordTrainingCompletion,
    saveTrainingNote,
    acknowledgeBirthday,
    createTrainingReminder,
    createStaffEvent,
  };
}
