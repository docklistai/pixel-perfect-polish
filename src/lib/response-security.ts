const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const STATIC_ASSET_PATH = /^\/(?:assets|icons)\/|^\/(?:favicon\.(?:ico|svg)|og-image\.png)$/i;

function shouldDisableStorage(response: Response, request: Request): boolean {
  if (response.headers.has("set-cookie")) return true;
  if (response.status >= 400) return true;
  if (!STATIC_ASSET_PATH.test(new URL(request.url).pathname)) return true;
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/html") || contentType.includes("application/json");
}

export function applyResponseSecurity(
  response: Response,
  request: Request,
  requestId: string,
): Response {
  const headers = new Headers(response.headers);
  headers.set("content-security-policy-report-only", CSP_REPORT_ONLY);
  headers.set("permissions-policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-request-id", requestId);
  if (new URL(request.url).protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  if (shouldDisableStorage(response, request)) {
    headers.set("cache-control", "private, no-store");
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
