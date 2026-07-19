import { SUPPORT_EMAIL } from "@/config/commercial";

/**
 * Version tags recorded in signup metadata when a user accepts the legal
 * pages. Bump a version whenever that page's content materially changes.
 * These records are an operational log of what was shown and accepted — not
 * immutable legal evidence. Formal legal review of both pages is still
 * required before open (non-invite) release; see docs/legal/README.md.
 */
export const LEGAL_VERSIONS = {
  terms: "2026-07-19",
  privacy: "2026-07-19",
} as const;

/**
 * OWNER-REVIEW PLACEHOLDER — operational decisions deliberately unresolved:
 * the legal contact below is the approved temporary support mailbox, not a
 * confirmed legal contact; the operating legal entity, VAT/registration
 * details, governing law, and formal legal review of both pages remain open
 * owner decisions (see docs/legal/README.md). Nothing in the app may claim
 * these are settled.
 */
export const LEGAL_CONTACT_EMAIL = SUPPORT_EMAIL;

export interface LegalSection {
  heading: string;
  body: string[];
  bullets?: string[];
}
