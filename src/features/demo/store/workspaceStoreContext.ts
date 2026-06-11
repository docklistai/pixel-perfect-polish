import * as React from "react";
import type { WorkspaceStore } from "./createWorkspaceStore";

export const WorkspaceStoreContext = React.createContext<WorkspaceStore | null>(null);
