import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  deleteRoleBudgetFn,
  fetchRoleBudgetsFn,
  saveRoleBudgetFn,
  type RoleBudget,
  type SaveRoleBudgetInput,
} from "../api/roleBudgets";

const KEY = (workspaceId: string | null) => ["settings", "role-budgets", workspaceId];

export type RoleBudgetsState = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  budgets: RoleBudget[];
  isSaving: boolean;
  save: (input: SaveRoleBudgetInput) => Promise<{ ok: true } | { ok: false; message: string }>;
  remove: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
};

/** Manager per-role weekly hours budgets for the active workspace. */
export function useRoleBudgets(): RoleBudgetsState {
  const { workspaceId, role } = useManagerIdentity();
  const queryClient = useQueryClient();
  const enabled =
    Boolean(getSupabaseEnv()) &&
    workspaceId !== null &&
    (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: KEY(workspaceId),
    queryFn: () => fetchRoleBudgetsFn(),
    enabled,
    staleTime: 30_000,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: KEY(workspaceId) });

  const saveMutation = useMutation({
    mutationFn: (input: SaveRoleBudgetInput) => saveRoleBudgetFn({ data: input }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoleBudgetFn({ data: { id } }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    budgets: query.data?.budgets ?? [],
    isSaving: saveMutation.isPending,
    save: (input) => saveMutation.mutateAsync(input),
    remove: (id) => deleteMutation.mutateAsync(id),
  };
}
