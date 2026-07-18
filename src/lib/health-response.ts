const HEALTH_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
};

export function createHealthResponse(request: Request): Response | undefined {
  if (new URL(request.url).pathname !== "/health") return undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return Response.json(
      { status: "method_not_allowed" },
      { headers: { ...HEALTH_HEADERS, allow: "GET, HEAD" }, status: 405 },
    );
  }
  if (request.method === "HEAD") {
    return new Response(null, { headers: HEALTH_HEADERS, status: 200 });
  }
  return Response.json(
    { status: "ok", service: "docklist", scope: "edge" },
    { headers: HEALTH_HEADERS, status: 200 },
  );
}
