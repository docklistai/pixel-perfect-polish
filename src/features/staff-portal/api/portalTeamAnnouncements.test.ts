import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  mapPortalTeamAnnouncement,
  needsAcknowledgement,
  sortPortalTeamAnnouncements,
  type PortalTeamAnnouncement,
} from "./portalTeamAnnouncements";

function viewRow(overrides: Record<string, unknown> = {}) {
  return {
    announcement_id: "a1",
    title: "Summer menu",
    body: "Please read the new summer menu.",
    pinned: false,
    requires_acknowledgement: true,
    highlight_in_updates: false,
    published_at: "2026-08-10T09:00:00Z",
    read_at: null,
    acknowledged_at: null,
    ...overrides,
  } as never;
}

function announcement(overrides: Partial<PortalTeamAnnouncement> = {}): PortalTeamAnnouncement {
  return {
    id: "a1",
    title: "Summer menu",
    body: "Body",
    pinned: false,
    requiresAcknowledgement: true,
    highlighted: false,
    publishedAt: "2026-08-10T09:00:00Z",
    readAt: null,
    acknowledgedAt: null,
    ...overrides,
  };
}

describe("portal announcement mapping", () => {
  it("maps the staff-safe view row", () => {
    const mapped = mapPortalTeamAnnouncement(
      viewRow({ read_at: "2026-08-10T10:00:00Z", highlight_in_updates: true }),
    );
    expect(mapped).toEqual({
      id: "a1",
      title: "Summer menu",
      body: "Please read the new summer menu.",
      pinned: false,
      requiresAcknowledgement: true,
      highlighted: true,
      publishedAt: "2026-08-10T09:00:00Z",
      readAt: "2026-08-10T10:00:00Z",
      acknowledgedAt: null,
    });
  });

  it("carries no other recipient's data and no manager-only fields", () => {
    // The staff-safe view has no roster, no comments and no birthday columns;
    // this locks the mapped shape so none can be added by accident later.
    const mapped = mapPortalTeamAnnouncement(viewRow());
    const keys = Object.keys(mapped).join(" ");
    expect(keys).not.toMatch(/recipient|roster|comment|author|birth|acknowledgedCount|readCount/i);
    expect(Object.keys(mapped)).toHaveLength(9);
  });

  it("reads the request for confirmation only when one was asked for", () => {
    expect(needsAcknowledgement(announcement())).toBe(true);
    expect(needsAcknowledgement(announcement({ requiresAcknowledgement: false }))).toBe(false);
    expect(needsAcknowledgement(announcement({ acknowledgedAt: "2026-08-10T11:00:00Z" }))).toBe(
      false,
    );
  });
});

describe("highlightInUpdates has a visible effect", () => {
  it("sorts highlighted announcements above everything else", () => {
    const sorted = sortPortalTeamAnnouncements([
      announcement({ id: "old", publishedAt: "2026-08-09T09:00:00Z" }),
      announcement({ id: "highlighted", highlighted: true, publishedAt: "2026-08-01T09:00:00Z" }),
      announcement({ id: "new", publishedAt: "2026-08-11T09:00:00Z" }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["highlighted", "new", "old"]);
  });

  it("ranks pinned above ordinary, and newest within a band", () => {
    const sorted = sortPortalTeamAnnouncements([
      announcement({ id: "plain", publishedAt: "2026-08-11T09:00:00Z" }),
      announcement({ id: "pinned", pinned: true, publishedAt: "2026-08-01T09:00:00Z" }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["pinned", "plain"]);
  });

  it("keeps highlighting above pinning, since it is the explicit manager choice", () => {
    const sorted = sortPortalTeamAnnouncements([
      announcement({ id: "pinned", pinned: true }),
      announcement({ id: "highlighted", highlighted: true }),
    ]);
    expect(sorted[0].id).toBe("highlighted");
  });
});

describe("portal Team delivery honesty", () => {
  const source = (path: string) => readFileSync(path, "utf8");

  it("no longer promises documents on the Home team card", () => {
    const home = source("src/features/staff-portal/components/HomeTab.tsx");
    expect(home).not.toMatch(/Team announcements and documents will appear here/);
    expect(home).toContain("PortalTeamUpdatesCard");
    // Documents stay switched off for the pilot and must keep saying so.
    expect(source("src/features/staff-portal/components/PortalDocumentsDrawer.tsx")).toContain(
      "Documents aren't available yet",
    );
  });

  it("reads Team announcements live, with no fixture fallback", () => {
    const hook = source("src/features/staff-portal/hooks/usePortalTeamAnnouncements.ts");
    expect(hook).toContain("fetchPortalTeamAnnouncements");
    // Assert the imports, not the prose — the file legitimately explains in a
    // comment that there is deliberately no demo fallback.
    const imports = hook
      .split("\n")
      .filter((line) => line.startsWith("import"))
      .join("\n");
    expect(imports).not.toMatch(/mockPortalData|features\/demo|WorkspaceStore/i);
  });

  it("acknowledges through the recipient's own RPC, never a direct table write", () => {
    const actions = source("src/features/staff-portal/api/portalActions.ts");
    expect(actions).toContain("rpc_team_acknowledge_announcement");
    expect(actions).toContain("rpc_team_mark_announcement_read");
    expect(actions).not.toMatch(/from\("team_announcement_recipients"\)/);
  });
});
