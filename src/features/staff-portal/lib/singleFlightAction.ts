export interface SingleFlightAction {
  isPending: () => boolean;
  run: (action: () => Promise<void>) => Promise<boolean>;
}

/** Immediate mutex for user actions; unlike rendered state, it closes in the same event tick. */
export function createSingleFlightAction(): SingleFlightAction {
  let pending = false;
  return {
    isPending: () => pending,
    run: async (action) => {
      if (pending) return false;
      pending = true;
      try {
        await action();
        return true;
      } finally {
        pending = false;
      }
    },
  };
}
