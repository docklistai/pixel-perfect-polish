/**
 * Version tags recorded in signup metadata when a user accepts the legal
 * pages. Bump a version whenever that page's content materially changes.
 * These records are an operational log of what was shown and accepted — not
 * immutable legal evidence. Formal legal review of both pages is still
 * required before open (non-invite) release; see docs/legal/README.md.
 */
export const LEGAL_VERSIONS = {
  terms: "2026-07-10",
  privacy: "2026-07-10",
} as const;

/** Owner-review placeholder: confirm this is the intended legal contact. */
export const LEGAL_CONTACT_EMAIL = "docklistai@gmail.com";

export interface LegalSection {
  heading: string;
  body: string[];
  bullets?: string[];
}
