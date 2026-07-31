import { describe, expect, it } from "vitest";
import {
  describeResolution,
  resolveDepartmentByName,
  resolveRoleName,
  resolveStaffByName,
} from "./exactResolvers";

const STAFF = [
  { id: "a", name: "Amelia Stone", active: true },
  { id: "b", name: "Ben Carter", active: true },
  { id: "c", name: "Ben Carter", active: true },
  { id: "d", name: "Cara Diaz", active: false },
];

describe("staff resolution never guesses", () => {
  it("resolves a unique active name", () => {
    const outcome = resolveStaffByName("Amelia Stone", STAFF);
    expect(outcome.kind).toBe("resolved");
    expect(outcome.kind === "resolved" && outcome.value.id).toBe("a");
  });

  it("tolerates case and spacing", () => {
    expect(resolveStaffByName("  amelia   stone ", STAFF).kind).toBe("resolved");
  });

  it("reports a shared name as ambiguous rather than taking the first", () => {
    // Two real people can share a name. Picking one assigns a real shift to the
    // wrong person, and nobody notices until someone does not turn up.
    const outcome = resolveStaffByName("Ben Carter", STAFF);
    expect(outcome.kind).toBe("ambiguous");
    expect(outcome.kind === "ambiguous" && outcome.candidates).toHaveLength(2);
  });

  it("does not resolve an inactive person", () => {
    expect(resolveStaffByName("Cara Diaz", STAFF).kind).toBe("unresolved");
  });

  it("reports unknown names as unresolved", () => {
    expect(resolveStaffByName("Nobody Here", STAFF).kind).toBe("unresolved");
  });

  it("treats blank input as unresolved", () => {
    expect(resolveStaffByName("   ", STAFF).kind).toBe("unresolved");
  });

  it("never matches a partial name", () => {
    expect(resolveStaffByName("Amelia", STAFF).kind).toBe("unresolved");
    expect(resolveStaffByName("Stone", STAFF).kind).toBe("unresolved");
  });
});

describe("department resolution", () => {
  const DEPARTMENTS = [
    { id: "d1", name: "Front of House", active: true },
    { id: "d2", name: "Kitchen", active: true },
    { id: "d3", name: "Spa", active: false },
  ];

  it("resolves an exact active department", () => {
    const outcome = resolveDepartmentByName("kitchen", DEPARTMENTS);
    expect(outcome.kind === "resolved" && outcome.value.id).toBe("d2");
  });

  it("does not resolve a deactivated department", () => {
    expect(resolveDepartmentByName("Spa", DEPARTMENTS).kind).toBe("unresolved");
  });
});

describe("role resolution", () => {
  it("resolves an exact role", () => {
    expect(resolveRoleName("Bar", ["Bar", "Barista"]).kind).toBe("resolved");
  });

  it("never matches a shorter role to a longer one", () => {
    expect(resolveRoleName("Bar", ["Barista"]).kind).toBe("unresolved");
  });

  it("reports duplicate configured roles as ambiguous", () => {
    expect(resolveRoleName("bar", ["Bar", "BAR"]).kind).toBe("ambiguous");
  });
});

describe("describeResolution", () => {
  it("says nothing for a resolved outcome", () => {
    expect(describeResolution({ kind: "resolved", value: 1 }, "staff member", "x")).toBeNull();
  });

  it("names what was not found", () => {
    expect(describeResolution({ kind: "unresolved" }, "staff member", " Nobody ")).toBe(
      'No staff member called "Nobody" was found.',
    );
  });

  it("explains an ambiguous match without picking one", () => {
    const message = describeResolution(
      { kind: "ambiguous", candidates: [1, 2] },
      "staff member",
      "Ben Carter",
    );
    expect(message).toContain("More than one staff member");
    expect(message).toContain("not applied");
  });
});
