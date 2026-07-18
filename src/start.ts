import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { reportServerError } from "./lib/safe-errors";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    const failure = reportServerError(error, {
      operation: "request.middleware",
      fallbackMessage: "Something went wrong. Please try again.",
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
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
