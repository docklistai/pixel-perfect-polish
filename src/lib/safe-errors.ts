const DEFAULT_CUSTOMER_MESSAGE = "Something went wrong. Please try again.";

const SAFE_CODE_MESSAGES: Readonly<Record<string, string>> = {
  "23503": "That record is still in use. Refresh and try again.",
  "23505": "That conflicts with an existing record. Refresh and try again.",
  "40001": "That change could not be completed safely. Please try again.",
  "40P01": "That change could not be completed safely. Please try again.",
  "42501": "You do not have permission to do that.",
  "57014": "That request took too long. Please try again.",
  PGRST301: "Your session is no longer valid. Sign in and try again.",
};

const UUID_PATH_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Codes our own RPCs use for `raise exception '<hand-authored customer text>'
// using errcode = '...'` — see e.g. rpc_decide_leave_request,
// rpc_request_open_shift. Any other code's message is never shown verbatim.
const BUSINESS_MESSAGE_PASSTHROUGH_CODES = new Set(["55000", "22023"]);
const MAX_BUSINESS_MESSAGE_LENGTH = 300;
// Signatures of raw Postgres/PostgREST internals that must never reach a
// customer even if a `raise exception` accidentally includes them.
const RAW_INTERNAL_TEXT_PATTERN =
  /relation "|column "|constraint "|duplicate key|violates|syntax error|null value in|permission denied for|schema "|does not exist$/i;

export interface SafeCustomerFailure {
  message: string;
  referenceId: string;
}

export interface ReportServerErrorOptions {
  operation: string;
  fallbackMessage?: string;
  request?: Request;
  referenceId?: string;
}

interface ErrorShape {
  code?: unknown;
  name?: unknown;
  status?: unknown;
  message?: unknown;
}

export interface ServerErrorRecord {
  event: "server_error";
  referenceId: string;
  operation: string;
  errorType: string;
  code?: string;
  status?: number;
  method?: string;
  pathname?: string;
}

function asErrorShape(error: unknown): ErrorShape {
  return error !== null && typeof error === "object" ? (error as ErrorShape) : {};
}

function safeToken(value: unknown, fallback: string, maxLength = 80): string {
  return typeof value === "string" && /^[a-z0-9._-]+$/i.test(value)
    ? value.slice(0, maxLength)
    : fallback;
}

function errorCode(error: unknown): string | undefined {
  const code = asErrorShape(error).code;
  return typeof code === "string" && /^[a-z0-9_]+$/i.test(code) ? code.slice(0, 24) : undefined;
}

function safePathname(url: string): string {
  return new URL(url).pathname
    .split("/")
    .map((segment) =>
      UUID_PATH_SEGMENT.test(segment) || segment.length > 32 || segment.includes("@")
        ? ":redacted"
        : segment,
    )
    .join("/")
    .slice(0, 200);
}

export function createErrorReference(): string {
  return `err-${globalThis.crypto.randomUUID()}`;
}

export function createRequestReference(): string {
  return `req-${globalThis.crypto.randomUUID()}`;
}

export function toSafeCustomerMessage(
  error: unknown,
  fallbackMessage = DEFAULT_CUSTOMER_MESSAGE,
): string {
  const code = errorCode(error);
  return (code && SAFE_CODE_MESSAGES[code]) || fallbackMessage;
}

/**
 * Maps a Postgres/PostgREST error to safe, specific customer copy for the
 * handful of RPC error codes this codebase's convention treats as
 * hand-authored, customer-safe business text (see
 * BUSINESS_MESSAGE_PASSTHROUGH_CODES). That text passes through verbatim
 * only if it doesn't look like raw internal detail; every other code, and
 * anything that fails that check, falls back to toSafeCustomerMessage —
 * never the raw driver message.
 */
export function toSafeBusinessMessage(
  error: unknown,
  fallbackMessage = DEFAULT_CUSTOMER_MESSAGE,
): string {
  const code = errorCode(error);
  const rawMessage = asErrorShape(error).message;
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

  if (
    code &&
    BUSINESS_MESSAGE_PASSTHROUGH_CODES.has(code) &&
    message.length > 0 &&
    message.length <= MAX_BUSINESS_MESSAGE_LENGTH &&
    !RAW_INTERNAL_TEXT_PATTERN.test(message)
  ) {
    return message;
  }

  return toSafeCustomerMessage(error, fallbackMessage);
}

export function createServerErrorRecord(
  error: unknown,
  options: ReportServerErrorOptions & { referenceId: string },
): ServerErrorRecord {
  const shape = asErrorShape(error);
  const record: ServerErrorRecord = {
    event: "server_error",
    referenceId: safeToken(options.referenceId, createErrorReference()),
    operation: safeToken(options.operation, "unknown"),
    errorType: safeToken(shape.name, "UnknownError"),
  };
  const code = errorCode(error);
  if (code) record.code = code;
  if (typeof shape.status === "number" && shape.status >= 400 && shape.status <= 599) {
    record.status = shape.status;
  }
  if (options.request) {
    record.method = safeToken(options.request.method, "UNKNOWN", 12).toUpperCase();
    record.pathname = safePathname(options.request.url);
  }
  return record;
}

export function reportServerError(
  error: unknown,
  options: ReportServerErrorOptions,
): SafeCustomerFailure {
  const referenceId = safeToken(options.referenceId, createErrorReference());
  const record = createServerErrorRecord(error, { ...options, referenceId });
  console.error(JSON.stringify({ ...record, occurredAt: new Date().toISOString() }));
  return {
    message: toSafeCustomerMessage(error, options.fallbackMessage),
    referenceId,
  };
}
