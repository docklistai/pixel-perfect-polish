import { renderErrorPage } from "./lib/error-page";
import { createHealthResponse } from "./lib/health-response";
import { applyResponseSecurity } from "./lib/response-security";
import { createRequestReference, reportServerError } from "./lib/safe-errors";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(error: unknown, request: Request, operation: string): Response {
  const failure = reportServerError(error, {
    fallbackMessage: "Something went wrong. Please try again.",
    operation,
    request,
  });
  return new Response(renderErrorPage(failure.referenceId), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-error-id": failure.referenceId,
    },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  return brandedErrorResponse(new Error("Unhandled SSR response"), request, "ssr.response");
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const requestId = createRequestReference();
    const healthResponse = createHealthResponse(request);
    if (healthResponse) return applyResponseSecurity(healthResponse, request, requestId);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response, request);
      return applyResponseSecurity(normalized, request, requestId);
    } catch (error) {
      const response = brandedErrorResponse(error, request, "server.fetch");
      return applyResponseSecurity(response, request, requestId);
    }
  },
};
