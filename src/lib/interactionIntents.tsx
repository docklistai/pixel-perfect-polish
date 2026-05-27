/**
 * Interaction Intent bus.
 *
 * Allows global surfaces (command palette, home quick actions) to request a
 * route-local drawer/modal to open after navigation. Frontend-only, in-memory.
 *
 * Flow:
 *   - Route mounts and registers a handler with `useIntentHandler(name, fn)`.
 *   - Caller dispatches `requestIntent("rota.addShift")`.
 *   - If a handler is registered, it fires immediately.
 *   - Otherwise the intent is queued and drained as soon as a matching handler
 *     registers (e.g. after `navigate({to: "/rota"})` completes mounting).
 *
 * Only the most recently requested intent is kept. There is no persistence
 * beyond the React tree's lifetime.
 */
import * as React from "react";

export type IntentName =
  | "rota.publish"
  | "rota.generate"
  | "rota.addShift"
  | "staff.add"
  | "leave.new";

type Handler = () => void;

interface IntentBus {
  requestIntent: (name: IntentName) => void;
  registerHandler: (name: IntentName, fn: Handler) => () => void;
}

const IntentBusContext = React.createContext<IntentBus | null>(null);

export function InteractionIntentProvider({ children }: { children: React.ReactNode }) {
  const handlersRef = React.useRef<Map<IntentName, Handler>>(new Map());
  const [pending, setPending] = React.useState<IntentName | null>(null);

  const requestIntent = React.useCallback((name: IntentName) => {
    const fn = handlersRef.current.get(name);
    if (fn) {
      fn();
      return;
    }
    setPending(name);
  }, []);

  const registerHandler = React.useCallback(
    (name: IntentName, fn: Handler) => {
      handlersRef.current.set(name, fn);
      // Drain any queued intent for this name on the next tick so the route's
      // surface state has time to settle after mount.
      if (pending === name) {
        const queued = fn;
        setPending(null);
        queueMicrotask(() => queued());
      }
      return () => {
        if (handlersRef.current.get(name) === fn) {
          handlersRef.current.delete(name);
        }
      };
    },
    [pending],
  );

  const value = React.useMemo<IntentBus>(
    () => ({ requestIntent, registerHandler }),
    [requestIntent, registerHandler],
  );

  return <IntentBusContext.Provider value={value}>{children}</IntentBusContext.Provider>;
}

function useIntentBus(): IntentBus {
  const ctx = React.useContext(IntentBusContext);
  if (!ctx) {
    // Safe no-op fallback; lets callers run outside the provider in isolation
    // (tests, storybook) without crashing.
    return {
      requestIntent: () => {},
      registerHandler: () => () => {},
    };
  }
  return ctx;
}

/** Dispatch intents from any component. */
export function useIntents() {
  const { requestIntent } = useIntentBus();
  return { requestIntent };
}

/**
 * Register a route-local handler for an intent. Latest handler for a given
 * name wins; previous handlers are overwritten so callers do not need to
 * coordinate. The handler unregisters on unmount.
 */
export function useIntentHandler(name: IntentName, fn: Handler) {
  const { registerHandler } = useIntentBus();
  const fnRef = React.useRef(fn);
  React.useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  React.useEffect(() => {
    const stable: Handler = () => fnRef.current();
    const dispose = registerHandler(name, stable);
    return dispose;
  }, [name, registerHandler]);
}
