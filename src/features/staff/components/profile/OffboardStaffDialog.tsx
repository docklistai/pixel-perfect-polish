import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserX, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  offboardStaffMemberFn,
  type OffboardFutureAssignment,
  type OffboardStaffMemberResult,
} from "../../api/offboardStaffMember";

function AssignmentList({ title, items }: { title: string; items: OffboardFutureAssignment[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-warning/30 bg-warning-soft/20 p-3">
      <div className="text-xs font-semibold text-foreground">{title}</div>
      <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
        {items.slice(0, 6).map((item, index) => (
          <li key={index}>
            {item.shiftDate} · {item.roleName}
          </li>
        ))}
        {items.length > 6 && <li>…and {items.length - 6} more</li>}
      </ul>
    </div>
  );
}

/**
 * Confirmation dialog for transactional staff offboarding. Requires a reason,
 * runs one atomic database operation, and reports every future assignment
 * that now needs manager action.
 */
export function OffboardStaffDialog({
  open,
  onOpenChange,
  staffMemberId,
  staffName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMemberId: string;
  staffName: string;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = React.useState("");
  const [outcome, setOutcome] = React.useState<Extract<
    OffboardStaffMemberResult,
    { ok: true }
  > | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await offboardStaffMemberFn({
        data: { staffMemberId, reason },
      });
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      setOutcome(result);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(
        result.alreadyOffboarded
          ? `${staffName} was already offboarded`
          : `${staffName} has been offboarded`,
        {
          description: result.alreadyOffboarded
            ? "No changes were made."
            : "Portal access revoked. Historical records are retained.",
        },
      );
    },
    onError: (error: Error) => {
      toast.error("Offboarding not completed", { description: error.message });
    },
  });

  const close = (next: boolean) => {
    if (!next) {
      setReason("");
      setOutcome(null);
      mutation.reset();
    }
    onOpenChange(next);
  };

  const hasFutureWork =
    outcome !== null &&
    (outcome.futureDraftAssignments.length > 0 || outcome.futurePublishedAssignments.length > 0);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-danger" aria-hidden />
            Offboard {staffName}
          </DialogTitle>
          <DialogDescription>
            Marks {staffName} as left, ends their portal access, and revokes any unused access
            codes. Shifts, time entries, and leave history are kept. This does not delete anything.
          </DialogDescription>
        </DialogHeader>

        {outcome === null ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="offboard-reason">Reason</Label>
              <Textarea
                id="offboard-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Left the business on good terms"
                maxLength={500}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => close(false)} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || reason.trim().length === 0}
              >
                {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {mutation.isPending ? "Offboarding…" : "Offboard staff member"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              {hasFutureWork ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    These upcoming assignments still name {staffName} and need your action —
                    reassign or remove them in the Rota, then republish affected weeks.
                  </p>
                  <AssignmentList
                    title="Draft shifts to reassign or remove"
                    items={outcome.futureDraftAssignments}
                  />
                  <AssignmentList
                    title="Published shifts (republish after fixing the draft)"
                    items={outcome.futurePublishedAssignments}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming assignments name {staffName}. Nothing else needs your action.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
