import { toast } from "sonner";
import { createErrorReference } from "@/lib/safe-errors";

/**
 * Convert a rejected transport/server-function call into an honest UI error.
 * Business-result failures (`{ ok: false, message }`) are already mapped to
 * safe copy by the server function and handled separately by the caller —
 * this only ever runs for a genuinely unexpected failure (the promise itself
 * rejecting), so it never echoes the raw error and always hands back a
 * reference the customer can quote.
 */
export async function runTimeWrite<T>(action: () => Promise<T>, title: string): Promise<T | null> {
  try {
    return await action();
  } catch {
    const referenceId = createErrorReference();
    toast.error(title, {
      description: `Something went wrong. Please try again. Reference: ${referenceId}`,
    });
    return null;
  }
}
