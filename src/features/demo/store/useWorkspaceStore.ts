import * as React from "react";
import type { WorkspaceStore } from "./createWorkspaceStore";
import { WorkspaceStoreContext } from "./workspaceStoreContext";
import type { WorkspaceState } from "./workspaceStoreTypes";

export function useWorkspaceStore(): WorkspaceStore {
  const store = React.useContext(WorkspaceStoreContext);
  if (!store) {
    throw new Error("useWorkspaceStore must be used inside <WorkspaceStoreProvider>");
  }
  return store;
}

/**
 * Subscribe to a slice of workspace state.
 *
 * Selectors must return references held inside the (immutable) state — never
 * freshly built arrays/objects — or useSyncExternalStore will re-render in a
 * loop. Derive computed values with useMemo in the consumer instead.
 */
export function useWorkspaceSelector<T>(selector: (state: WorkspaceState) => T): T {
  const store = useWorkspaceStore();
  const getSnapshot = React.useCallback(
    () => selector(store.getState()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectors are expected to be stable pure functions
    [store],
  );
  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
