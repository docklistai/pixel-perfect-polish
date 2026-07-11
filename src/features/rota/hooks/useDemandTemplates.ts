import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  applyDemandTemplateFn,
  deleteDemandTemplateFn,
  fetchDemandTemplatesFn,
  saveDemandTemplateFn,
  type DemandTemplateSummary,
  type DemandTemplateWriteResult,
} from "../api/demandTemplates";

const KEY = (workspaceId: string | null) => ["rota", "demand-templates", workspaceId];

export type DemandTemplatesState = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  templates: DemandTemplateSummary[];
  isSaving: boolean;
  isApplying: boolean;
  save: (
    rotaWeekId: string,
    name: string,
    notes: string | null,
  ) => Promise<DemandTemplateWriteResult>;
  apply: (rotaWeekId: string, templateId: string) => Promise<DemandTemplateWriteResult>;
  remove: (templateId: string) => Promise<DemandTemplateWriteResult>;
};

/** Manager demand templates for the active workspace, with save/apply/delete. */
export function useDemandTemplates(): DemandTemplatesState {
  const { workspaceId, role } = useManagerIdentity();
  const queryClient = useQueryClient();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: KEY(workspaceId),
    queryFn: () => fetchDemandTemplatesFn(),
    enabled,
    staleTime: 30_000,
  });

  const invalidateTemplates = () =>
    void queryClient.invalidateQueries({ queryKey: KEY(workspaceId) });

  const saveMutation = useMutation({
    mutationFn: (vars: { rotaWeekId: string; name: string; notes: string | null }) =>
      saveDemandTemplateFn({ data: vars }),
    onSuccess: (result) => {
      if (result.ok) invalidateTemplates();
    },
  });

  const applyMutation = useMutation({
    mutationFn: (vars: { rotaWeekId: string; templateId: string }) =>
      applyDemandTemplateFn({ data: vars }),
    onSuccess: (result) => {
      // New open shifts landed in the draft week — refresh the live grid.
      if (result.ok) void queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteDemandTemplateFn({ data: { templateId } }),
    onSuccess: (result, templateId) => {
      if (result.ok) {
        queryClient.setQueryData<{ templates: DemandTemplateSummary[] }>(
          KEY(workspaceId),
          (current) =>
            current
              ? { templates: current.templates.filter((template) => template.id !== templateId) }
              : current,
        );
        invalidateTemplates();
      }
    },
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    templates: query.data?.templates ?? [],
    isSaving: saveMutation.isPending,
    isApplying: applyMutation.isPending,
    save: (rotaWeekId, name, notes) => saveMutation.mutateAsync({ rotaWeekId, name, notes }),
    apply: (rotaWeekId, templateId) => applyMutation.mutateAsync({ rotaWeekId, templateId }),
    remove: (templateId) => deleteMutation.mutateAsync(templateId),
  };
}
