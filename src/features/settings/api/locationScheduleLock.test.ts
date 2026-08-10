import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { locationHasScheduleData } from "./locationScheduleLock";

/**
 * The time-zone lock decides whether an existing shift's DISPLAYED time would be
 * restated, so it asks one question only: does this location have scheduling
 * data. These tests drive it through a fake client that honours the filters,
 * which is what proves the scope is per-location rather than per-workspace.
 */

const WORKSPACE = "ws-1";
const LOCATION = "loc-current";
const OTHER_LOCATION = "loc-other";

type Row = { id: string; workspace_id: string; location_id: string };

type RecordedCall = { table: string; columns: string; limit: number | null };

/** Applies `.eq()` filters for real so location scoping is genuinely exercised. */
function fakeSupabase(tables: { shifts?: Row[]; published_rota_shifts?: Row[] }) {
  const calls: RecordedCall[] = [];

  function builderFor(table: string) {
    const call: RecordedCall = { table, columns: "", limit: null };
    calls.push(call);
    let rows = [...(tables[table as keyof typeof tables] ?? [])];

    const builder = {
      select(columns: string) {
        call.columns = columns;
        return builder;
      },
      eq(column: string, value: unknown) {
        rows = rows.filter((row) => row[column as keyof Row] === value);
        return builder;
      },
      limit(count: number) {
        call.limit = count;
        rows = rows.slice(0, count);
        return builder;
      },
      then(
        resolve: (value: { data: Row[]; error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return builder;
  }

  const client = {
    from(table: string) {
      return builderFor(table);
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}

function row(overrides: Partial<Row> = {}): Row {
  return { id: "row-1", workspace_id: WORKSPACE, location_id: LOCATION, ...overrides };
}

function run(tables: { shifts?: Row[]; published_rota_shifts?: Row[] }) {
  const { client, calls } = fakeSupabase(tables);
  return locationHasScheduleData({
    supabase: client,
    workspaceId: WORKSPACE,
    locationId: LOCATION,
  }).then((locked) => ({ locked, calls }));
}

describe("locationHasScheduleData", () => {
  it("leaves the time zone editable when the location has never been scheduled", async () => {
    const { locked } = await run({ shifts: [], published_rota_shifts: [] });
    expect(locked).toBe(false);
  });

  it("locks once a draft shift exists at the location", async () => {
    const { locked } = await run({ shifts: [row()], published_rota_shifts: [] });
    expect(locked).toBe(true);
  });

  it("locks when only a published shift remains", async () => {
    // The draft can be deleted after publication, but the snapshot staff read
    // still renders through this zone — so the published row alone must lock it.
    const { locked } = await run({ shifts: [], published_rota_shifts: [row()] });
    expect(locked).toBe(true);
  });

  it("ignores shifts scheduled at another location", async () => {
    const { locked } = await run({
      shifts: [row({ id: "elsewhere", location_id: OTHER_LOCATION })],
      published_rota_shifts: [row({ id: "elsewhere-published", location_id: OTHER_LOCATION })],
    });
    expect(locked).toBe(false);
  });

  it("ignores rows belonging to another workspace", async () => {
    const { locked } = await run({
      shifts: [row({ id: "other-tenant", workspace_id: "ws-2" })],
      published_rota_shifts: [],
    });
    expect(locked).toBe(false);
  });

  it("probes both tables as bounded existence checks", async () => {
    const { calls } = await run({ shifts: [], published_rota_shifts: [] });
    expect(calls.map((call) => call.table).sort()).toEqual(["published_rota_shifts", "shifts"]);
    // Never `select('*')`, and never more rows than the question needs.
    for (const call of calls) {
      expect(call.columns).toBe("id");
      expect(call.limit).toBe(1);
    }
  });
});
