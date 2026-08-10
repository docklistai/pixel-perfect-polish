import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  fetchWorkspaceProfileFn,
  updateOpeningDaysFn,
  updateOpeningTimesFn,
  updateRotaStartDayFn,
} from "../api/workspaceProfile";
import { updateLocationNameFn, updateLocationTimezoneFn } from "../api/locationSettings";

const KEY = (workspaceId: string | null) => ["settings", "workspace-profile", workspaceId];

type WriteResult = { ok: true } | { ok: false; message: string };

export type WorkspaceProfileState = {
  enabled: boolean;
  isLoading: boolean;
  /** 7-bit open-days mask, or null when unconfigured (open every day). */
  openWeekdaysMask: number | null;
  /** Default opening / closing times "HH:MM", or null when unconfigured. */
  openTime: string | null;
  closeTime: string | null;
  /** The workspace's primary location, or null while loading / none exists. */
  primaryLocation: { id: string; name: string; timezone: string; timezoneLocked: boolean } | null;
  /**
   * True only once a live read has PROVED the workspace has no active location.
   * `primaryLocation === null` alone cannot say that — it is also the loading,
   * errored, and demo-workspace value, and none of those should be reported to a
   * manager as "you have no location".
   */
  hasNoActiveLocation: boolean;
  /** First weekday of the rota week: 0 = Monday .. 6 = Sunday. */
  rotaStartWeekday: number;
  /** True once a rota week exists — the start day is then locked. */
  hasRotas: boolean;
  isSaving: boolean;
  saveOpeningDays: (mask: number) => Promise<WriteResult>;
  saveOpeningTimes: (openTime: string | null, closeTime: string | null) => Promise<WriteResult>;
  saveLocationName: (locationId: string, name: string) => Promise<WriteResult>;
  saveLocationTimezone: (locationId: string, timezone: string) => Promise<WriteResult>;
  saveRotaStartDay: (rotaStartWeekday: number) => Promise<WriteResult>;
};

/** Workspace business config (opening days) for the active manager workspace. */
export function useWorkspaceProfile(): WorkspaceProfileState {
  const { workspaceId, role } = useManagerIdentity();
  const queryClient = useQueryClient();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: KEY(workspaceId),
    queryFn: () => fetchWorkspaceProfileFn(),
    enabled,
    staleTime: 60_000,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: KEY(workspaceId) });

  const openingDaysMutation = useMutation({
    mutationFn: (mask: number) => updateOpeningDaysFn({ data: { openWeekdaysMask: mask } }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const locationMutation = useMutation({
    mutationFn: (vars: { locationId: string; name: string }) =>
      updateLocationNameFn({ data: vars }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const timezoneMutation = useMutation({
    mutationFn: (vars: { locationId: string; timezone: string }) =>
      updateLocationTimezoneFn({ data: vars }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const openingTimesMutation = useMutation({
    mutationFn: (vars: { openTime: string | null; closeTime: string | null }) =>
      updateOpeningTimesFn({ data: vars }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const rotaStartMutation = useMutation({
    mutationFn: (rotaStartWeekday: number) => updateRotaStartDayFn({ data: { rotaStartWeekday } }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    openWeekdaysMask: query.data?.openWeekdaysMask ?? null,
    openTime: query.data?.openTime ?? null,
    closeTime: query.data?.closeTime ?? null,
    primaryLocation: query.data?.primaryLocation ?? null,
    hasNoActiveLocation: query.isSuccess && query.data.primaryLocation === null,
    rotaStartWeekday: query.data?.rotaStartWeekday ?? 0,
    hasRotas: query.data?.hasRotas ?? false,
    isSaving:
      openingDaysMutation.isPending ||
      locationMutation.isPending ||
      timezoneMutation.isPending ||
      openingTimesMutation.isPending ||
      rotaStartMutation.isPending,
    saveOpeningDays: (mask) => openingDaysMutation.mutateAsync(mask),
    saveOpeningTimes: (openTime, closeTime) =>
      openingTimesMutation.mutateAsync({ openTime, closeTime }),
    saveLocationName: (locationId, name) => locationMutation.mutateAsync({ locationId, name }),
    saveLocationTimezone: (locationId, timezone) =>
      timezoneMutation.mutateAsync({ locationId, timezone }),
    saveRotaStartDay: (rotaStartWeekday) => rotaStartMutation.mutateAsync(rotaStartWeekday),
  };
}
