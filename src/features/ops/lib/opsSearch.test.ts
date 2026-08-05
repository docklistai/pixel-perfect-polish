import { describe, expect, it } from "vitest";
import {
  filtersFromSearch,
  parseOpsSearch,
  prefillFromSearch,
  searchFromFilters,
} from "./opsSearch";

const ID = "12345678-1234-4234-8234-123456789abc";

describe("Ops typed query/filter contract", () => {
  it("accepts supported filters, pagination and rota prefill", () => {
    const parsed = parseOpsSearch({
      q: " freezer ",
      type: "incident",
      status: "open",
      priority: "critical",
      sort: "time_asc",
      page: "3",
      location: ID,
      create: "1",
      shiftId: ID,
      staffMemberId: ID,
      handover: ID,
      briefing: ID,
    });
    expect(filtersFromSearch(parsed)).toMatchObject({
      search: "freezer",
      entryType: "incident",
      status: "open",
      priority: "critical",
      sort: "time_asc",
      page: 3,
      locationId: ID,
    });
    expect(prefillFromSearch(parsed)).toMatchObject({
      create: true,
      locationId: ID,
      shiftId: ID,
      staffMemberId: ID,
    });
    expect(parsed).toMatchObject({ handover: ID, briefing: ID });
  });

  it("drops malformed and unsupported values without throwing", () => {
    expect(
      parseOpsSearch({
        type: "chat",
        status: "deleted",
        priority: "urgent",
        page: -2,
        location: "not-a-uuid",
        shiftId: "no",
      }),
    ).toEqual({});
  });

  it("round-trips active list filters without retaining defaults", () => {
    const filters = filtersFromSearch({ q: "pump", status: "in_progress", page: 2 });
    expect(searchFromFilters(filters)).toEqual({
      q: "pump",
      status: "in_progress",
      page: 2,
      type: undefined,
      priority: undefined,
      location: undefined,
      sort: undefined,
    });
  });
});
