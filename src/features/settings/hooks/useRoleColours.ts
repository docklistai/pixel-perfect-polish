import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  deleteRoleColourFn,
  fetchRoleColoursFn,
  saveRoleColourFn,
  type RoleColour,
  type SaveRoleColourInput,
} from "../api/roleColours";

const KEY = (workspaceId: string | null) => ["settings", "role-colours", workspaceId];

export type RoleColoursState = {
  enabled: boolean;
  isLoading: boolean;
  colours: RoleColour[];
  /** Lowercased role name → colour preset id, for the rota grid. */
  configMap: Record<string, string>;
  isSaving: boolean;
  save: (input: SaveRoleColourInput) => Promise<{ ok: true } | { ok: false; message: string }>;
  remove: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
};

/** Manager per-role colour presets for the active workspace. */
export function useRoleColours(): RoleColoursState {
  const { workspaceId, role } = useManagerIdentity();
  const queryClient = useQueryClient();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: KEY(workspaceId),
    queryFn: () => fetchRoleColoursFn(),
    enabled,
    staleTime: 60_000,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: KEY(workspaceId) });

  const saveMutation = useMutation({
    mutationFn: (input: SaveRoleColourInput) => saveRoleColourFn({ data: input }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoleColourFn({ data: { id } }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const colours = query.data?.colours;
  const configMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const colour of colours ?? [])
      map[colour.roleName.trim().toLowerCase()] = colour.colourPreset;
    return map;
  }, [colours]);

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    colours: colours ?? [],
    configMap,
    isSaving: saveMutation.isPending,
    save: (input) => saveMutation.mutateAsync(input),
    remove: (id) => deleteMutation.mutateAsync(id),
  };
}
