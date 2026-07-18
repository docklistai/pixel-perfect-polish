import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { clearAuthStateCache } from "../authStateCache";

const REVALIDATE_INTERVAL_MS = 60_000;

/**
 * Re-checks auth/membership state periodically and whenever the tab regains
 * focus, then lets the router's own beforeLoad guards (requireStaffPortalAccess,
 * requireManagerAccess, requireNoWorkspaceState) redirect if access changed
 * elsewhere — e.g. a manager resets this device's staff access from another
 * browser mid-session. Without this, a device left open on a protected page
 * only notices on its next real navigation or a manual reload; the 30s
 * authStateCache TTL alone doesn't force anything to re-check it.
 */
export function useAuthStateRevalidation(): void {
  const router = useRouter();

  React.useEffect(() => {
    const revalidate = () => {
      clearAuthStateCache();
      void router.invalidate();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") revalidate();
    };

    const intervalId = window.setInterval(revalidate, REVALIDATE_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", revalidate);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", revalidate);
    };
  }, [router]);
}
