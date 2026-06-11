import type { WorkspaceState } from "./workspaceStoreTypes";

export type WorkspaceStore = {
  getState: () => WorkspaceState;
  setState: (updater: (state: WorkspaceState) => WorkspaceState) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createWorkspaceStore(initialState: WorkspaceState): WorkspaceStore {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const next = updater(state);
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
