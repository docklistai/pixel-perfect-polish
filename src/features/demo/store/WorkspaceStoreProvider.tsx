import * as React from "react";
import { createWorkspaceStore } from "./createWorkspaceStore";
import { seedWorkspaceState } from "./seedWorkspaceState";
import { WorkspaceStoreContext } from "./workspaceStoreContext";

export function WorkspaceStoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = React.useState(() => createWorkspaceStore(seedWorkspaceState()));
  return <WorkspaceStoreContext.Provider value={store}>{children}</WorkspaceStoreContext.Provider>;
}
