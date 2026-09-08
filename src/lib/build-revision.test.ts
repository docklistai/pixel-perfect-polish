import { describe, expect, it } from "vitest";

import {
  appRevision,
  readRevision,
  resolveBuildRevision,
  UNKNOWN_REVISION,
} from "./build-revision";

const FULL_SHA = "4d573bf4e423596a4c72af8e7b4d9b5c98174726";

describe("resolveBuildRevision", () => {
  it("abbreviates a full Git object name", () => {
    expect(resolveBuildRevision([FULL_SHA])).toBe("4d573bf");
  });

  it("accepts an already-abbreviated revision unchanged", () => {
    expect(resolveBuildRevision(["4d573bf"])).toBe("4d573bf");
  });

  it("trims and lower-cases what a shell or host handed it", () => {
    expect(resolveBuildRevision([`  ${FULL_SHA.toUpperCase()}\n`])).toBe("4d573bf");
  });

  it("skips candidates the environment left empty and takes the next", () => {
    expect(resolveBuildRevision([undefined, null, "", "   ", FULL_SHA])).toBe("4d573bf");
  });

  it("honours candidate order, so an explicit override wins", () => {
    expect(resolveBuildRevision(["abc1234", FULL_SHA])).toBe("abc1234");
  });

  it("refuses anything that is not a Git object name, so no value can leak", () => {
    expect(
      resolveBuildRevision([
        "sb_secret_value",
        "https://example.test/build/1",
        "v1.2.3",
        "not-hex",
        // Too short to be an unambiguous revision.
        "4d573b",
        // Longer than any Git object name.
        `${FULL_SHA}0`,
      ]),
    ).toBe(UNKNOWN_REVISION);
  });

  it("reports unknown when the build environment offered nothing", () => {
    expect(resolveBuildRevision([])).toBe(UNKNOWN_REVISION);
  });
});

describe("readRevision", () => {
  it("accepts exactly what the build injects", () => {
    expect(readRevision("4d573bf")).toBe("4d573bf");
  });

  it("falls back when the define was never applied", () => {
    expect(readRevision(undefined)).toBe(UNKNOWN_REVISION);
  });

  it("refuses an injected value of the wrong shape rather than publishing it", () => {
    for (const raw of ["", "unknown", FULL_SHA, "SECRET!", 4573, null, {}]) {
      expect(readRevision(raw)).toBe(UNKNOWN_REVISION);
    }
  });
});

describe("appRevision", () => {
  it("reports unknown in a runtime with no injected revision", () => {
    // The whole point of the guard: this test process has no bundler define,
    // and reading the missing global must not throw.
    expect(appRevision()).toBe(UNKNOWN_REVISION);
  });
});
