import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { updateWorkspaceNameFn } from "../api/workspaceProfile";

/** Live workspace (business) name editor. Enabled for owner/manager sessions. */
export function useUpdateWorkspaceName() {
  const queryClient = useQueryClient();
  const { role, workspaceName } = useManagerIdentity();
  const enabled = Boolean(getSupabaseEnv()) && (role === "owner" || role === "manager");

  const mutation = useMutation({
    mutationFn: (name: string) => updateWorkspaceNameFn({ data: { name } }),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: ["manager-identity"] });
    },
  });

  return {
    enabled,
    currentName: workspaceName,
    isSaving: mutation.isPending,
    save: (name: string) => mutation.mutateAsync(name),
  };
}
