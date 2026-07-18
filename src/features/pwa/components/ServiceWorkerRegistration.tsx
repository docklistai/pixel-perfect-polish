import * as React from "react";
import { useIsMutating } from "@tanstack/react-query";
import {
  readDocumentUpdateActivity,
  updateBoundaryBlockReason,
} from "../lib/serviceWorkerUpdateSafety";

const SKIP_WAITING = "SKIP_WAITING";

/** Registers the online-first worker and lets the user activate updates at an idle boundary. */
export function ServiceWorkerRegistration() {
  const activeMutations = useIsMutating();
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);
  const [noticeVisible, setNoticeVisible] = React.useState(false);
  const [blockedMessage, setBlockedMessage] = React.useState<string | null>(null);
  const reloadRequestedRef = React.useRef(false);

  React.useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let disposed = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const offerUpdate = (worker: ServiceWorker | null) => {
      if (!worker || disposed) return;
      setWaitingWorker(worker);
      setNoticeVisible(true);
    };
    const onControllerChange = () => {
      if (!hadController || disposed || !reloadRequestedRef.current) return;
      window.location.reload();
    };
    const markFormDirty = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest("form") : null;
      if (target instanceof HTMLFormElement) target.dataset.dirty = "true";
    };
    const clearResetForm = (event: Event) => {
      if (event.target instanceof HTMLFormElement) delete event.target.dataset.dirty;
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("input", markFormDirty, true);
    document.addEventListener("change", markFormDirty, true);
    document.addEventListener("reset", clearResetForm, true);

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (disposed) return;
        offerUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              offerUpdate(installing);
            }
          });
        });
        await registration.update();
      } catch {
        // Registration failure leaves the online app usable; deployment logs carry diagnostics.
      }
    };

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("input", markFormDirty, true);
      document.removeEventListener("change", markFormDirty, true);
      document.removeEventListener("reset", clearResetForm, true);
    };
  }, []);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    const blockReason = updateBoundaryBlockReason(
      readDocumentUpdateActivity(document, activeMutations),
    );
    if (blockReason) {
      setBlockedMessage(blockReason);
      return;
    }
    setBlockedMessage(null);
    reloadRequestedRef.current = true;
    waitingWorker.postMessage(SKIP_WAITING);
  };

  if (!waitingWorker || !noticeVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-border bg-background p-4 shadow-lg"
    >
      <p className="text-sm font-semibold">Docklist update ready</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Apply it when you have finished the current form or change.
      </p>
      {blockedMessage && (
        <p role="alert" className="mt-2 text-xs text-warning">
          {blockedMessage}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="btn ghost sm" onClick={() => setNoticeVisible(false)}>
          Later
        </button>
        <button
          type="button"
          className="btn primary sm"
          onClick={applyUpdate}
          disabled={activeMutations > 0}
          aria-busy={activeMutations > 0}
        >
          Apply update
        </button>
      </div>
    </div>
  );
}
