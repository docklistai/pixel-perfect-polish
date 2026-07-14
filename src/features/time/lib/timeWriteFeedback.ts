import { toast } from "sonner";

/** Convert a rejected transport/server-function call into an honest UI error. */
export async function runTimeWrite<T>(action: () => Promise<T>, title: string): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again.",
    });
    return null;
  }
}
