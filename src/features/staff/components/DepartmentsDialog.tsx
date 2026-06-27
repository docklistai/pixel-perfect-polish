import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { Archive, Building2, Check, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ActionButton, DialogShell } from "@/components/dl";
import {
  createDepartmentFn,
  fetchManageableDepartmentsFn,
  renameDepartmentFn,
  setDepartmentStatusFn,
} from "../api/manageDepartments";
import { validateDepartmentName } from "../lib/departmentName";
import type { ManageableDepartment } from "../types";

const staffRouteApi = getRouteApi("/staff");

interface DepartmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Department management is live-only; the demo seed cannot back real writes. */
  source: "live" | "demo";
}

export function DepartmentsDialog({ open, onOpenChange, source }: DepartmentsDialogProps) {
  const queryClient = useQueryClient();
  const { auth } = staffRouteApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    open && source === "live" && Boolean(getSupabaseEnv()) && auth.status === "member";

  const query = useQuery({
    queryKey: ["staff", "manageable-departments", workspaceId],
    queryFn: () => fetchManageableDepartmentsFn(),
    enabled,
    staleTime: 30_000,
  });
  const departments = query.data ?? [];

  const [newName, setNewName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setNewName("");
      setError(null);
      setEditingId(null);
      setBusy(false);
    }
  }, [open]);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff", "manageable-departments", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["staff", "workspace-departments"] }),
      queryClient.invalidateQueries({ queryKey: ["staff", "workspace-roster"] }),
    ]);

  async function handleAdd() {
    const check = validateDepartmentName(newName, departments);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createDepartmentFn({ data: { name: check.name } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNewName("");
      await refresh();
      toast.success(`Department "${check.name}" added`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(dept: ManageableDepartment) {
    const check = validateDepartmentName(editName, departments, dept.id);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await renameDepartmentFn({ data: { id: dept.id, name: check.name } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditingId(null);
      await refresh();
      toast.success("Department renamed");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(dept: ManageableDepartment) {
    const nextStatus = dept.status === "active" ? "inactive" : "active";
    setBusy(true);
    setError(null);
    try {
      const result = await setDepartmentStatusFn({ data: { id: dept.id, status: nextStatus } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await refresh();
      toast.success(nextStatus === "inactive" ? "Department archived" : "Department restored");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Departments"
      description="Add, rename, or archive the departments staff and rotas are organised by."
      icon={Building2}
      size="lg"
      footer={
        <ActionButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
          Done
        </ActionButton>
      }
    >
      <div className="space-y-4">
        {source === "demo" && (
          <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2 text-xs text-muted-foreground">
            This roster is demo data. Departments can only be managed on a live workspace.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label htmlFor="new-department" className="text-xs font-medium text-muted-foreground">
              Add a department
            </label>
            <input
              id="new-department"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Housekeeping"
              className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm"
            />
          </div>
          <ActionButton
            size="sm"
            onClick={handleAdd}
            disabled={busy || !newName.trim() || source !== "live"}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Add
          </ActionButton>
        </div>

        <ul className="divide-y divide-border/60 rounded-xl border border-border">
          {query.isLoading && (
            <li className="px-3 py-3 text-xs text-muted-foreground">Loading departments…</li>
          )}
          {!query.isLoading && departments.length === 0 && (
            <li className="px-3 py-3 text-xs text-muted-foreground">No departments yet.</li>
          )}
          {departments.map((dept) => (
            <li key={dept.id} className="flex items-center gap-2 px-3 py-2">
              {editingId === dept.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setError(null);
                    }}
                    className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm"
                    aria-label={`Rename ${dept.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(dept)}
                    disabled={busy}
                    aria-label="Save name"
                    className="rounded-md p-1.5 text-success hover:bg-success-soft"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 text-sm ${dept.status === "inactive" ? "text-muted-foreground line-through" : ""}`}
                  >
                    {dept.name}
                    {dept.status === "inactive" && (
                      <span className="ml-2 text-[11px] uppercase tracking-wide text-muted-foreground no-underline">
                        Archived
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(dept.id);
                      setEditName(dept.name);
                      setError(null);
                    }}
                    disabled={busy || source !== "live"}
                    aria-label={`Rename ${dept.name}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(dept)}
                    disabled={busy || source !== "live"}
                    aria-label={
                      dept.status === "active" ? `Archive ${dept.name}` : `Restore ${dept.name}`
                    }
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    {dept.status === "active" ? (
                      <Archive className="h-4 w-4" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Archived departments stay on past rotas and existing staff but are hidden from new
          assignment pickers. Starter departments can be renamed but are kept unless you archive
          them.
        </p>
      </div>
    </DialogShell>
  );
}
