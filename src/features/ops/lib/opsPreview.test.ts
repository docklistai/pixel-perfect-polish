import { describe, expect, it } from "vitest";
import {
  OPS_PREVIEW_BANNER_DESCRIPTION,
  OPS_PREVIEW_BANNER_TITLE,
  OPS_PREVIEW_TOAST_TITLE,
  opsPreviewMessage,
} from "./opsPreview";

/** Words that would dishonestly imply a real backend effect occurred. */
const FORBIDDEN_CLAIMS = [
  "saved",
  "delivered",
  "exported",
  "created",
  "queued",
  "queue",
  "pinned",
  "audit log",
  "sent",
];

describe("opsPreview honesty copy", () => {
  it("banner makes clear Ops is a preview built on sample data", () => {
    expect(OPS_PREVIEW_BANNER_TITLE.toLowerCase()).toContain("preview");
    const body = OPS_PREVIEW_BANNER_DESCRIPTION.toLowerCase();
    expect(body).toContain("sample data");
    expect(body).toContain("nothing is saved");
  });

  it("toast title signals preview, not success", () => {
    expect(OPS_PREVIEW_TOAST_TITLE.toLowerCase()).toContain("preview");
  });

  it("action message says the action is not available yet", () => {
    const msg = opsPreviewMessage("Exporting the log").toLowerCase();
    expect(msg).toContain("exporting the log");
    expect(msg).toContain("isn't available");
  });

  it("falls back to honest generic copy with no action", () => {
    expect(opsPreviewMessage().toLowerCase()).toContain("isn't available");
  });

  it("never claims a persistence/delivery effect occurred", () => {
    const samples = [
      opsPreviewMessage(),
      opsPreviewMessage("Handing over notes"),
      opsPreviewMessage("Saving comments"),
      opsPreviewMessage("Adding a follow-up"),
    ];
    for (const sample of samples) {
      const lower = sample.toLowerCase();
      for (const claim of FORBIDDEN_CLAIMS) {
        expect(lower).not.toContain(claim);
      }
    }
  });
});
