import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TIMEZONE_LOCKED_MESSAGE } from "./locationScheduleLock";
import { hasAnyOpenDay, NO_OPEN_DAYS_MESSAGE } from "../lib/openingDays";

/**
 * The refusals these assert are decided inside `createServerFn` handlers, which
 * bind to request cookies and cannot be invoked from a unit test. The behaviour
 * of each decision is covered directly (`locationScheduleLock.test.ts`,
 * `openingDays.test.ts`); what remains to prove is that the write path actually
 * consults it, and does so BEFORE the update — a guard that runs after the write
 * is not a guard. Source order is the honest way to check that here; the
 * end-to-end refusal is covered by the browser smoke.
 */

const source = readFileSync("src/features/settings/api/workspaceProfile.ts", "utf8");
const locationSource = readFileSync("src/features/settings/api/locationSettings.ts", "utf8");
const topbarSource = readFileSync("src/components/layout/topbar/TopbarActions.tsx", "utf8");

/** The body of one exported server function, up to the next export. */
function handlerBody(fileSource: string, exportName: string): string {
  const start = fileSource.indexOf(`export const ${exportName}`);
  expect(start, `${exportName} not found`).toBeGreaterThan(-1);
  const next = fileSource.indexOf("\nexport const ", start + 1);
  return fileSource.slice(start, next === -1 ? fileSource.length : next);
}

describe("timezone write guard", () => {
  const body = handlerBody(locationSource, "updateLocationTimezoneFn");

  it("refuses the write when the location already has scheduling data", () => {
    expect(body).toContain("locationHasScheduleData");
    expect(body).toContain("TIMEZONE_LOCKED_MESSAGE");
  });

  it("runs the guard before touching locations, so the UI lock cannot be bypassed", () => {
    const guardAt = body.indexOf("locationHasScheduleData");
    const updateAt = body.indexOf(".update(");
    expect(guardAt).toBeGreaterThan(-1);
    expect(updateAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(updateAt);
  });

  it("scopes the lock to the location being edited, not the workspace", () => {
    expect(body).toContain("locationId: data.locationId");
  });

  it("explains the refusal in terms of what the manager would have changed", () => {
    expect(TIMEZONE_LOCKED_MESSAGE).toContain("shifts have been scheduled for this location");
    expect(TIMEZONE_LOCKED_MESSAGE).toContain("how existing shift times are displayed");
  });
});

describe("opening-days write guard", () => {
  const body = handlerBody(source, "updateOpeningDaysFn");

  it("refuses an all-closed mask before the write", () => {
    const guardAt = body.indexOf("hasAnyOpenDay");
    const updateAt = body.indexOf(".update(");
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(updateAt);
    expect(body).toContain("NO_OPEN_DAYS_MESSAGE");
  });

  it("shares one rule with the toggle UI", () => {
    expect(hasAnyOpenDay(0)).toBe(false);
    expect(hasAnyOpenDay(0b0000001)).toBe(true);
    expect(NO_OPEN_DAYS_MESSAGE).toContain("at least one trading day");
    const section = readFileSync("src/features/settings/components/OpeningDaysSection.tsx", "utf8");
    expect(section).toContain("hasAnyOpenDay");
    expect(section).toContain("NO_OPEN_DAYS_MESSAGE");
  });
});

describe("rota start day", () => {
  it("keeps its existing authoritative lock once a rota week exists", () => {
    const body = handlerBody(source, "updateRotaStartDayFn");
    expect(body).toContain('.from("rota_weeks")');
    expect(body).toContain("it's locked once a week exists");
    const guardAt = body.indexOf('.from("rota_weeks")');
    expect(guardAt).toBeLessThan(body.indexOf('.from("workspaces")'));
  });

  it("warns before the lock without inventing a confirmation state", () => {
    const fields = readFileSync(
      "src/features/settings/components/WorkspaceIdentityFields.tsx",
      "utf8",
    );
    expect(fields).toContain("Check this before you build your first rota");
    // No stored "confirmed" flag exists, so nothing may claim one.
    expect(fields).not.toMatch(/startDayConfirmed|confirmedStartDay/);
    expect(source).not.toMatch(/rota_start_confirmed|start_day_confirmed/);
  });
});

describe("topbar account menu honesty", () => {
  it("stops pointing Profile at Settings, which has no profile management", () => {
    expect(topbarSource).not.toContain("Manage your profile from Settings");
    expect(topbarSource).toContain("Profile management arrives in a later update.");
  });

  it("treats Profile the same way as Account settings", () => {
    expect(topbarSource).toContain("Account management arrives in a later update.");
  });
});
