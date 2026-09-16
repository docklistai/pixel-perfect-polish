import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeTeamBirthdayFn } from "../api/teamMutations";
import { useTeamCommands } from "./useTeamCommands";

vi.mock("../api/teamMutations", () => ({
  acknowledgeTeamAnnouncementFn: vi.fn(),
  acknowledgeTeamBirthdayFn: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  addTeamAnnouncementCommentFn: vi.fn(),
  createTeamAnnouncementFn: vi.fn(),
  createTeamStaffEventFn: vi.fn().mockResolvedValue({ ok: true, data: { event_id: "event-1" } }),
  createTeamTrainingReminderFn: vi
    .fn()
    .mockResolvedValue({ ok: true, data: { reminder_id: "reminder-1" } }),
  recordTeamTrainingCompletionFn: vi.fn(),
  remindTeamNonReadersFn: vi.fn(),
  sendTeamTrainingReminderFn: vi.fn(),
  setTeamTrainingNoteFn: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}));

describe("useTeamCommands", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the occurrence year selected by the backend rather than the browser year", async () => {
    const run = vi.fn(async (operation: () => Promise<unknown>) => {
      await operation();
      return true;
    });
    const actions = {
      pending: false,
      run,
      runForResult: vi.fn(),
    } as unknown as Parameters<typeof useTeamCommands>[0];
    const { result } = renderHook(() => useTeamCommands(actions));

    await act(() => result.current.acknowledgeBirthday("staff-1", 2027));

    expect(acknowledgeTeamBirthdayFn).toHaveBeenCalledWith({
      data: {
        requestId: expect.any(String),
        staffMemberId: "staff-1",
        birthdayYear: 2027,
      },
    });
  });

  it("creates training reminders and attaches notes", async () => {
    const runForResult = vi.fn(async (operation: () => Promise<unknown>) => {
      return await operation();
    });
    const actions = {
      pending: false,
      run: vi.fn(),
      runForResult,
    } as unknown as Parameters<typeof useTeamCommands>[0];
    const { result } = renderHook(() => useTeamCommands(actions));

    await act(() =>
      result.current.createTrainingReminder({
        kind: "training",
        title: "Fire Safety",
        audienceKind: "all_staff",
        audienceDepartmentId: null,
        dueAt: "2026-07-01T09:00:00.000Z",
        mandatory: true,
        note: "Required for kitchen team",
      }),
    );

    expect(runForResult).toHaveBeenCalled();
  });
});
