import { describe, expect, it } from "vitest";
import { suggestOpsPriority } from "@/components/ai/opsSupportTopics";
import { localDateInTimezone } from "./opsDates";
import { updateOpsEntrySnapshot } from "./opsOptimistic";
import { isOpsTaskType } from "./opsPresentation";
import { canAcknowledgeOpsRecord, recipientForActor } from "./opsRecipients";
import type { OpsEntry, OpsPageData } from "../types";

const entry = {
  id: "entry-1",
  entryType: "incident",
  status: "open",
  priority: "normal",
  pinned: false,
  assignedStaffMemberId: null,
} as OpsEntry;

describe("Ops deterministic client contracts", () => {
  it("classifies every non-incident entry in Tasks and incidents only in Incidents", () => {
    expect(
      ["task", "maintenance", "service_request", "note"].every((type) =>
        isOpsTaskType(type as OpsEntry["entryType"]),
      ),
    ).toBe(true);
    expect(isOpsTaskType("incident")).toBe(false);
  });
  it("gates briefing and handover actions to the current unacknowledged recipient", () => {
    const recipients = [
      {
        membershipId: "manager-2",
        name: "Manny",
        readAt: null,
        acknowledgedAt: null as string | null,
      },
    ];
    expect(recipientForActor(recipients, "author")).toBeNull();
    expect(canAcknowledgeOpsRecord(recipients, "author")).toBe(false);
    expect(canAcknowledgeOpsRecord(recipients, "manager-2")).toBe(true);
    recipients[0]!.acknowledgedAt = "2026-08-03T12:00:00Z";
    expect(canAcknowledgeOpsRecord(recipients, "manager-2")).toBe(false);
  });
  it("suggests priority only from due time, severity, assignment and status", () => {
    const now = Date.parse("2026-08-03T12:00:00Z");
    expect(
      suggestOpsPriority(
        {
          dueAt: "2026-08-03T11:00:00Z",
          severity: null,
          assignedStaffMemberId: "staff",
          status: "open",
        },
        now,
      ),
    ).toBe("critical");
    expect(
      suggestOpsPriority(
        { dueAt: null, severity: "high", assignedStaffMemberId: "staff", status: "open" },
        now,
      ),
    ).toBe("high");
    expect(
      suggestOpsPriority(
        { dueAt: null, severity: null, assignedStaffMemberId: null, status: "open" },
        now,
      ),
    ).toBe("normal");
    expect(
      suggestOpsPriority(
        {
          dueAt: "2026-08-03T11:00:00Z",
          severity: "critical",
          assignedStaffMemberId: null,
          status: "resolved",
        },
        now,
      ),
    ).toBe("low");
  });

  it("derives calendar dates in the selected location timezone across midnight", () => {
    const now = new Date("2026-03-29T00:30:00Z");
    expect(localDateInTimezone("Europe/London", now)).toBe("2026-03-29");
    expect(localDateInTimezone("Pacific/Kiritimati", now)).toBe("2026-03-29");
    expect(localDateInTimezone("America/Los_Angeles", now)).toBe("2026-03-28");
  });

  it("updates both page and deep-linked detail snapshots without mutating the source", () => {
    const page = { entries: [entry], selectedEntry: entry } as OpsPageData;
    const updated = updateOpsEntrySnapshot(page, entry.id, { pinned: true, status: "in_progress" });
    expect(updated.entries[0]).toMatchObject({ pinned: true, status: "in_progress" });
    expect(updated.selectedEntry).toMatchObject({ pinned: true, status: "in_progress" });
    expect(page.entries[0]).toMatchObject({ pinned: false, status: "open" });
  });
});
