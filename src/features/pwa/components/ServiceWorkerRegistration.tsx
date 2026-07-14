import * as React from "react";

const SKIP_WAITING = "SKIP_WAITING";

/** Registers the minimal online-first worker and activates safe updates promptly. */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const activate = (worker: ServiceWorker | null) => worker?.postMessage(SKIP_WAITING);
    const onControllerChange = () => {
      if (!hadController || refreshing || disposed) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (disposed) return;
        activate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              activate(installing);
            }
          });
        });
        await registration.update();
      } catch (error) {
        console.warn("Docklist service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
