/**
 * The Git revision a build was made from.
 *
 * Docklist is published out-of-band — there is no CI pipeline stamping a
 * version — so "is production running the commit I think it is?" was a question
 * nobody could answer without guessing. This module is the whole answer: the
 * build resolves one short revision, `vite.config.ts` injects it, and `/health`
 * reads it back.
 *
 * Two halves, deliberately separate. `resolveBuildRevision` runs at BUILD time
 * against whatever the build environment offers; `appRevision` runs at REQUEST
 * time against the value that was injected. Both are pure, so the rule that
 * decides what counts as a revision is testable without a build.
 *
 * The pattern is not decoration. It is what stops this becoming a channel for
 * anything other than a commit id: an environment variable holding a token, a
 * URL, or a stray build log line does not match, and is reported as `unknown`
 * rather than published on an unauthenticated endpoint.
 */

/** Reported when the build environment offered no usable revision. */
export const UNKNOWN_REVISION = "unknown";

/** Short-SHA length. Long enough to be unambiguous, short enough to read. */
export const REVISION_LENGTH = 7;

/** A candidate revision: a Git object name, full or already abbreviated. */
const CANDIDATE_PATTERN = /^[0-9a-f]{7,40}$/;

/** An injected revision: exactly what {@link resolveBuildRevision} emits. */
const INJECTED_PATTERN = new RegExp(`^[0-9a-f]{${REVISION_LENGTH}}$`);

/**
 * The first candidate that is genuinely a Git revision, abbreviated.
 *
 * Candidates are tried in the caller's order and anything unusable is skipped
 * rather than refused, because a build environment routinely sets some of these
 * and not others — an empty `CF_PAGES_COMMIT_SHA` on a local build is normal,
 * not an error.
 */
export function resolveBuildRevision(candidates: readonly (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim().toLowerCase();
    if (!CANDIDATE_PATTERN.test(value)) continue;
    return value.slice(0, REVISION_LENGTH);
  }
  return UNKNOWN_REVISION;
}

/**
 * Validates an injected revision at request time.
 *
 * Checked again rather than trusted: the define is applied by the bundler, and
 * a build that skipped it leaves the identifier undefined. `/health` must
 * answer either way — a liveness endpoint that throws is worse than one that
 * says it does not know.
 */
export function readRevision(raw: unknown): string {
  return typeof raw === "string" && INJECTED_PATTERN.test(raw) ? raw : UNKNOWN_REVISION;
}

declare const __APP_REVISION__: string | undefined;

/** The revision this bundle was built from, or `unknown`. */
export function appRevision(): string {
  return readRevision(typeof __APP_REVISION__ === "string" ? __APP_REVISION__ : undefined);
}
