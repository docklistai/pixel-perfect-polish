import { describe, expect, it } from "vitest";
import { presentManagerNotification } from "./managerNotificationPresentation";
import type { ManagerNotificationRecord } from "../api/managerNotifications";

function record(
  relatedEntityType: string | null,
  overrides: Partial<ManagerNotificationRecord> = {},
): ManagerNotificationRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "announcement",
    title: "Action required",
    body: "Review the request.",
    relatedEntityType,
    relatedEntityId: "22222222-2222-4222-8222-222222222222",
    createdAt: "2026-07-14T09:30:00Z",
    readAt: null,
    staffMemberId: null,
    rotaWeekOffset: null,
    rotaLocationId: null,
    ...overrides,
  };
}

describe("presentManagerNotification", () => {
  it.each([
    ["leave_request", "/leave", "Review leave"],
    ["shift_release_request", "/rota", "Review release"],
    ["one_off_unavailability", "/staff", "Review request"],
    ["rota_week", "/rota", "Update rota"],
  ] as const)("routes %s deliveries to the decision surface", (entity, to, action) => {
    expect(presentManagerNotification(record(entity))).toMatchObject({ to, action, read: false });
  });

  it("uses the rota route for a legacy rota-update kind and preserves read state", () => {
    expect(
      presentManagerNotification(
        record(null, { kind: "rota_update_required", readAt: "2026-07-14T10:00:00Z" }),
      ),
    ).toMatchObject({ to: "/rota", action: "Update rota", read: true });
  });

  it("preserves resolved staff and rota deep-link context", () => {
    expect(
      presentManagerNotification(record("one_off_unavailability", { staffMemberId: "staff-123" })),
    ).toMatchObject({ staffId: "staff-123", staffSearch: { tab: "leave" } });
    expect(
      presentManagerNotification(
        record("shift_release_request", {
          rotaWeekOffset: 2,
          rotaLocationId: "33333333-3333-4333-8333-333333333333",
        }),
      ),
    ).toMatchObject({
      rotaSearch: { week: 2, location: "33333333-3333-4333-8333-333333333333" },
    });
  });

  it.each([
    ["ops_entry", { selected: "22222222-2222-4222-8222-222222222222" }],
    ["ops_handover", { handover: "22222222-2222-4222-8222-222222222222" }],
    ["ops_briefing", { briefing: "22222222-2222-4222-8222-222222222222" }],
  ] as const)("deep-links %s notifications to the exact Ops record", (entity, opsSearch) => {
    expect(presentManagerNotification(record(entity))).toMatchObject({ to: "/ops", opsSearch });
  });
});
