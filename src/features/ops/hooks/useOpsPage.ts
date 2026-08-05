import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchOpsPageFn } from "../api/opsRead";
import { filtersFromSearch, prefillFromSearch, type OpsRouteSearch } from "../lib/opsSearch";
import type { OpsEntry, OpsLogTab } from "../types";
import { useOpsActions } from "./useOpsActions";

const routeApi = getRouteApi("/ops");

export function useOpsPage(search: OpsRouteSearch) {
  const { auth } = routeApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled = Boolean(getSupabaseEnv()) && workspaceId !== null;
  const filters = React.useMemo(() => filtersFromSearch(search), [search]);
  const prefill = React.useMemo(() => prefillFromSearch(search), [search]);
  const [selectedId, setSelectedId] = React.useState<string | null>(search.selected ?? null);
  const [tab, setTab] = React.useState<OpsLogTab>("timeline");
  const [logEntryOpen, setLogEntryOpen] = React.useState(Boolean(prefill.create));
  const [handoverOpen, setHandoverOpen] = React.useState(Boolean(search.handover));
  const [briefingOpen, setBriefingOpen] = React.useState(Boolean(search.briefing));
  const [checklistOpen, setChecklistOpen] = React.useState(false);
  const actions = useOpsActions(workspaceId);
  React.useEffect(() => setSelectedId(search.selected ?? null), [search.selected]);
  React.useEffect(() => {
    if (search.handover) setHandoverOpen(true);
    if (search.briefing) setBriefingOpen(true);
  }, [search.handover, search.briefing]);

  const query = useQuery({
    queryKey: ["ops", workspaceId, filters, tab, selectedId],
    queryFn: () => fetchOpsPageFn({ data: { ...filters, tab, selectedEntryId: selectedId } }),
    enabled,
    staleTime: 10_000,
  });
  const selectedEntry: OpsEntry | null = query.data?.selectedEntry ?? null;

  return {
    workspaceId,
    enabled,
    filters,
    prefill,
    query,
    selectedEntry,
    selectedId,
    setSelectedId,
    tab,
    setTab,
    logEntryOpen,
    setLogEntryOpen,
    handoverOpen,
    selectedHandoverId: search.handover ?? null,
    setHandoverOpen,
    briefingOpen,
    setBriefingOpen,
    checklistOpen,
    setChecklistOpen,
    actions,
  };
}
