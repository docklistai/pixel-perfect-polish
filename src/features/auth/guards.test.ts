import { describe, expect, it } from "vitest";
import {
  redirectActiveMembers,
  requireManagerAccess,
  requireNoWorkspaceState,
  requireStaffPortalAccess,
} from "./guards";
import type { AuthState, WorkspaceRole } from "./types";

const getMemberState = (overrides?: Partial<Extract<AuthState, { status: "member" }>>) =>
  ({
    status: "member",
    userId: "user-1",
    email: "manager@example.com",
    workspaceId: "ws-1",
    membershipId: "m-1",
    role: "manager" as WorkspaceRole,
    staffMemberId: null,
    ...overrides,
  }) satisfies AuthState;

const signedOut: AuthState = { status: "signed-out" };

const noWorkspace: AuthState = {
  status: "no-workspace",
  userId: "user-1",
  email: "new@example.com",
  isAnonymous: false,
};

const selectionRequired: AuthState = {
  status: "workspace-selection-required",
  userId: "user-1",
  email: "multi@example.com",
  workspaces: [
    { workspaceId: "ws-1", name: "Harbour View", role: "owner" },
    { workspaceId: "ws-2", name: null, role: "manager" },
  ],
};

const noStaffProfile: AuthState = {
  status: "no-staff-profile",
  userId: "user-1",
  email: "staff@example.com",
  workspaceId: "ws-1",
  membershipId: "m-2",
};

/** Guards throw a Response with `.options.to`; capture it for assertions. */
function redirectTarget(run: () => void): string | null {
  try {
    run();
    return null;
  } catch (thrown) {
    return (thrown as { options?: { to?: string } }).options?.to ?? "unknown";
  }
}

describe("requireManagerAccess", () => {
  it("sends signed-out visitors to /auth", () => {
    expect(redirectTarget(() => requireManagerAccess(signedOut))).toBe("/auth");
  });

  it("sends every unresolved membership state to /no-access", () => {
    expect(redirectTarget(() => requireManagerAccess(noWorkspace))).toBe("/no-access");
    expect(redirectTarget(() => requireManagerAccess(selectionRequired))).toBe("/no-access");
    expect(redirectTarget(() => requireManagerAccess(noStaffProfile))).toBe("/no-access");
  });

  it("sends staff members to the portal and admits managers and owners", () => {
    expect(redirectTarget(() => requireManagerAccess(getMemberState({ role: "staff" })))).toBe(
      "/portal",
    );
    expect(
      redirectTarget(() => requireManagerAccess(getMemberState({ role: "manager" }))),
    ).toBeNull();
    expect(
      redirectTarget(() => requireManagerAccess(getMemberState({ role: "owner" }))),
    ).toBeNull();
  });
});

describe("requireStaffPortalAccess", () => {
  it("sends signed-out visitors to the access-code page", () => {
    expect(redirectTarget(() => requireStaffPortalAccess(signedOut))).toBe("/portal/access");
  });

  it("sends unresolved states to /no-access and managers home", () => {
    expect(redirectTarget(() => requireStaffPortalAccess(selectionRequired))).toBe("/no-access");
    expect(
      redirectTarget(() => requireStaffPortalAccess(getMemberState({ role: "manager" }))),
    ).toBe("/");
  });

  it("admits staff members", () => {
    expect(
      redirectTarget(() =>
        requireStaffPortalAccess(getMemberState({ role: "staff", staffMemberId: "s-1" })),
      ),
    ).toBeNull();
  });
});

describe("redirectActiveMembers", () => {
  it("sends members to their home surface and leaves everyone else alone", () => {
    expect(redirectTarget(() => redirectActiveMembers(getMemberState({ role: "staff" })))).toBe(
      "/portal",
    );
    expect(redirectTarget(() => redirectActiveMembers(getMemberState({ role: "owner" })))).toBe(
      "/",
    );
    expect(redirectTarget(() => redirectActiveMembers(signedOut))).toBeNull();
    expect(redirectTarget(() => redirectActiveMembers(selectionRequired))).toBeNull();
  });
});

describe("requireNoWorkspaceState", () => {
  it("keeps the incomplete-access states on /no-access", () => {
    expect(redirectTarget(() => requireNoWorkspaceState(noWorkspace))).toBeNull();
    expect(redirectTarget(() => requireNoWorkspaceState(selectionRequired))).toBeNull();
    expect(redirectTarget(() => requireNoWorkspaceState(noStaffProfile))).toBeNull();
  });

  it("bounces signed-out visitors and resolved members", () => {
    expect(redirectTarget(() => requireNoWorkspaceState(signedOut))).toBe("/auth");
    expect(redirectTarget(() => requireNoWorkspaceState(getMemberState({ role: "staff" })))).toBe(
      "/portal",
    );
    expect(redirectTarget(() => requireNoWorkspaceState(getMemberState({ role: "owner" })))).toBe(
      "/",
    );
  });
});
