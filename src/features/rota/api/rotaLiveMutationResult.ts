import {
  liveRotaRemoveMutationResult,
  liveRotaShiftMutationResult,
} from "./rotaLiveMutationSchemas";

const INVALID_RESULT_MESSAGE =
  "The rota server returned an invalid mutation result. The change was not confirmed.";

function parseResult<T>(value: unknown, parse: (input: unknown) => T): T {
  if (value instanceof Error) throw value;
  try {
    return parse(value);
  } catch {
    throw new Error(INVALID_RESULT_MESSAGE);
  }
}

/**
 * The server-function transport can resolve a raw JSON error body. These
 * validators are therefore the trust boundary: no caller may treat a write as
 * applied until its exact success envelope has been parsed.
 */
export function validateLiveRotaShiftResult(value: unknown) {
  return parseResult(value, (input) => liveRotaShiftMutationResult.parse(input));
}

export function validateLiveRotaRemoveResult(value: unknown) {
  return parseResult(value, (input) => liveRotaRemoveMutationResult.parse(input));
}
