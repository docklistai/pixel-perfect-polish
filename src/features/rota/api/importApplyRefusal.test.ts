import { describe, expect, it } from "vitest";
import {
  importApplyRefusalMessage,
  IMPORT_LEAVE_REFUSAL_MESSAGE,
  SQL_LEAVE_REFUSAL_FRAGMENT,
} from "./importApplyRefusal";

/**
 * The one refusal an importing manager used to read in Build's voice.
 *
 * `supabase/tests/phase66_import_pending_leave_tests.sql` asserts the database
 * still raises text containing `SQL_LEAVE_REFUSAL_FRAGMENT`, so these two sides
 * cannot drift apart without a suite going red.
 */

const SQL_TEXT = "Someone in this proposal now has leave on that day. Build it again.";

describe("importApplyRefusalMessage", () => {
  it("rewrites the shared leave refusal for an import", () => {
    expect(importApplyRefusalMessage(SQL_TEXT, true)).toBe(IMPORT_LEAVE_REFUSAL_MESSAGE);
  });

  it("says approved leave, because pending no longer refuses an import", () => {
    expect(importApplyRefusalMessage(SQL_TEXT, true)).toContain("approved leave");
  });

  it("never tells an importing manager to Build it again", () => {
    expect(importApplyRefusalMessage(SQL_TEXT, true)).not.toContain("Build it again");
    expect(importApplyRefusalMessage(SQL_TEXT, true)).not.toContain("proposal");
  });

  it("sends them back to preview, where the person and row can be named", () => {
    expect(importApplyRefusalMessage(SQL_TEXT, true)).toContain("Preview it again");
  });

  it("leaves Build's own wording untouched", () => {
    expect(importApplyRefusalMessage(SQL_TEXT, false)).toBe(SQL_TEXT);
  });

  it("passes every other import refusal through unchanged", () => {
    const other = "A department in this proposal is no longer active.";
    expect(importApplyRefusalMessage(other, true)).toBe(other);
  });

  it("matches on the stable fragment rather than the whole sentence", () => {
    const reworded = `Ana ${SQL_LEAVE_REFUSAL_FRAGMENT}. Try something else.`;
    expect(importApplyRefusalMessage(reworded, true)).toBe(IMPORT_LEAVE_REFUSAL_MESSAGE);
  });
});
