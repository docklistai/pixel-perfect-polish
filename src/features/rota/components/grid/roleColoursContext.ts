import { createContext, useContext } from "react";
import type { RoleColourConfig } from "../../lib/deptColours";

/**
 * Workspace per-role colour config for the rota grid (lowercased role → preset).
 * Provided at the grid root; the shift pill and legend read it so configured
 * role colours win over the built-in department palette. Empty in demo mode.
 */
export const RoleColoursContext = createContext<RoleColourConfig>({});

export function useRoleColoursConfig(): RoleColourConfig {
  return useContext(RoleColoursContext);
}
