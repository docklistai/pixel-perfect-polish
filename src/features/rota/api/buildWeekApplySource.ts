/**
 * The source descriptor a proposal is stamped with, and must be applied with.
 *
 * `rpc_internal_build_week_input_fingerprint` folds `p_source` into the
 * fingerprint. The apply RPC recomputes that fingerprint from the source the
 * client sends and refuses on any difference, so this object has to make the
 * round trip **unchanged** — reassembling it field by field on the client is how
 * a correct proposal turns into "This week changed while the proposal was open."
 *
 * Kept in its own module so both the proposal function and the import function
 * stamp with the same shape, and the client has one type to pass back.
 */
export type BuildWeekApplySource = {
  kind: "template" | "previous-week-pattern" | "current-week" | "headed-import";
  id: string | null;
  contentVersion: string;
  plannerRuleVersion: string;
};
