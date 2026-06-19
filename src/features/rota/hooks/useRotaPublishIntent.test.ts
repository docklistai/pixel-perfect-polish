import { describe, expect, it } from "vitest";
import { resolveRotaPublishIntent } from "./useRotaPublishIntent";
import type { RotaPublishEligibility } from "../lib/publishEligibility";

const eligible: RotaPublishEligibility = {
  canPublish: true,
  blockedReason: null,
};

const blocked: RotaPublishEligibility = {
  canPublish: false,
  blockedReason: "This rota is read-only.",
};

describe("resolveRotaPublishIntent", () => {
  it("keeps a publish intent queued while live data is still loading", () => {
    expect(resolveRotaPublishIntent(false, true, eligible)).toMatchObject({
      action: "queue",
      nextQueued: true,
    });
  });

  it("opens a queued publish intent once loading settles and eligibility is valid", () => {
    const queued = resolveRotaPublishIntent(false, true, eligible);
    const resolved = resolveRotaPublishIntent(queued.nextQueued, false, eligible);

    expect(queued).toMatchObject({ action: "queue", nextQueued: true });
    expect(resolved).toMatchObject({ action: "open", nextQueued: false });
  });

  it("blocks a queued publish intent when loading resolves to an ineligible state", () => {
    const queued = resolveRotaPublishIntent(false, true, eligible);
    const resolved = resolveRotaPublishIntent(queued.nextQueued, false, blocked);

    expect(queued).toMatchObject({ action: "queue", nextQueued: true });
    expect(resolved).toMatchObject({
      action: "blocked",
      nextQueued: false,
      blockedReason: "This rota is read-only.",
    });
  });
});
