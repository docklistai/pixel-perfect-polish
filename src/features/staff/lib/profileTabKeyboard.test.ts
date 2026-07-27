import { describe, expect, it } from "vitest";
import { nextProfileTabIndex } from "./profileTabKeyboard";

/** The staff profile has seven tabs. */
const COUNT = 7;

describe("nextProfileTabIndex", () => {
  it("moves right and wraps at the end", () => {
    expect(nextProfileTabIndex("ArrowRight", 0, COUNT)).toBe(1);
    expect(nextProfileTabIndex("ArrowRight", 5, COUNT)).toBe(6);
    expect(nextProfileTabIndex("ArrowRight", 6, COUNT)).toBe(0);
  });

  it("moves left and wraps at the start", () => {
    expect(nextProfileTabIndex("ArrowLeft", 6, COUNT)).toBe(5);
    expect(nextProfileTabIndex("ArrowLeft", 1, COUNT)).toBe(0);
    expect(nextProfileTabIndex("ArrowLeft", 0, COUNT)).toBe(6);
  });

  it("jumps to the first and last tab", () => {
    expect(nextProfileTabIndex("Home", 4, COUNT)).toBe(0);
    expect(nextProfileTabIndex("End", 4, COUNT)).toBe(COUNT - 1);
  });

  it("ignores keys the tablist does not own", () => {
    for (const key of ["ArrowUp", "ArrowDown", "Tab", "Escape", "a", "Enter", " "]) {
      expect(nextProfileTabIndex(key, 2, COUNT)).toBeNull();
    }
  });

  it("is safe with no tabs", () => {
    expect(nextProfileTabIndex("ArrowRight", 0, 0)).toBeNull();
  });
});
