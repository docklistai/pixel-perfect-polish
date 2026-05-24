import { Copy, Edit3, MoreHorizontal, Trash2, UserMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DraftShift } from "../../types";
import type { ShiftPillActionHandlers } from "./types";

export function ShiftActionMenu({
  shift,
  onEdit,
  onDuplicate,
  onRemove,
  onMarkOpen,
}: {
  shift: DraftShift;
  onEdit: ShiftPillActionHandlers["onOpen"];
  onDuplicate: ShiftPillActionHandlers["onDuplicate"];
  onRemove: ShiftPillActionHandlers["onRemove"];
  onMarkOpen: ShiftPillActionHandlers["onMarkOpen"];
}) {
  const isOpen = shift.staffId === null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${shift.role} shift`}
          className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-80 transition hover:bg-background/80 hover:text-foreground focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onEdit(shift.id)}>
          <Edit3 className="h-4 w-4" aria-hidden />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(shift.id)}>
          <Copy className="h-4 w-4" aria-hidden />
          Duplicate as open
        </DropdownMenuItem>
        {!isOpen && (
          <DropdownMenuItem onSelect={() => onMarkOpen(shift.id)}>
            <UserMinus className="h-4 w-4" aria-hidden />
            Mark as open
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onSelect={() => onRemove(shift.id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Remove shift
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
