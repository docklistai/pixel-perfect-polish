import {
  Briefcase,
  Copy,
  Edit3,
  ExternalLink,
  History,
  MoreHorizontal,
  Tag,
  Trash2,
  UserMinus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEPT_COLOUR_PRESETS } from "../../lib/deptColours";
import type { DraftShift } from "../../types";
import type { ShiftMenuHandlers } from "./types";

/**
 * Legacy department labels.
 *
 * These are NOT workspace departments — they are a fixed list kept only so the
 * existing filter drawer still offers familiar chips for historical
 * `deptOverride` values. The change-department menu now uses the workspace's
 * real active departments instead.
 */
export const LEGACY_DEPT_LABELS = [
  "Front of House",
  "Kitchen",
  "Bar",
  "Housekeeping",
  "Maintenance",
  "Porter",
] as const;

const COLOUR_PRESET_LABELS: Record<string, string> = {
  blue: "Blue",
  amber: "Amber",
  purple: "Purple",
  green: "Green",
  rose: "Rose",
  teal: "Teal",
  slate: "Slate",
};

export function ShiftActionMenu({
  shift,
  open,
  onOpenChange,
  handlers,
}: {
  shift: DraftShift;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  handlers: ShiftMenuHandlers;
}) {
  const isOpen = shift.staffId === null;
  const hasOverride = Boolean(shift.colourOverride || shift.deptOverride);
  // Null means the duplicate may proceed; anything else is the exact manager-
  // facing reason it cannot, shown under the disabled item.
  const duplicateBlockedReason = handlers.duplicateBlockedReason(shift);
  const canDuplicate = duplicateBlockedReason === null;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Actions for ${shift.role} shift (M)`}
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-80 hover:bg-background/80 hover:text-foreground focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Shift</DropdownMenuLabel>
        <DropdownMenuItem onSelect={handlers.onEditInline}>
          <Edit3 className="h-4 w-4" aria-hidden />
          Edit inline
          <DropdownMenuShortcut>↩</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onOpen(shift.id)}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open details
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canDuplicate}
          className="items-start"
          onSelect={() => handlers.onDuplicate(shift.id)}
        >
          <Copy className="h-4 w-4" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span>Duplicate to next day</span>
            {duplicateBlockedReason && (
              <span className="whitespace-normal text-[11px] text-muted-foreground">
                {duplicateBlockedReason}
              </span>
            )}
          </span>
          {canDuplicate && <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!isOpen && (
          <DropdownMenuItem onSelect={() => handlers.onMarkOpen(shift.id)}>
            <UserMinus className="h-4 w-4" aria-hidden />
            Mark as open shift
          </DropdownMenuItem>
        )}
        {(handlers.departments?.length ?? 0) > 0 && handlers.onSetDepartment && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Briefcase className="mr-2 h-4 w-4" aria-hidden />
              Change department…
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuLabel>Move this shift to</DropdownMenuLabel>
              {handlers.departments!.map((department) => (
                <DropdownMenuItem
                  key={department.id}
                  onSelect={() => handlers.onSetDepartment!(shift.id, department.id)}
                >
                  <Briefcase className="h-4 w-4" aria-hidden />
                  {department.name}
                  {shift.departmentId === department.id && " ✓"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Tag className="mr-2 h-4 w-4" aria-hidden />
            Change chip colour…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuLabel>Override chip colour</DropdownMenuLabel>
            {Object.values(DEPT_COLOUR_PRESETS).map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onSelect={() => handlers.onSetColour(shift.id, preset.id)}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-[3px] ${preset.swatch}`}
                  aria-hidden
                />
                {COLOUR_PRESET_LABELS[preset.id] ?? preset.id}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {hasOverride && (
          <DropdownMenuItem onSelect={() => handlers.onResetColour(shift.id)}>
            <History className="h-4 w-4" aria-hidden />
            Reset to default colour
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onSelect={() => handlers.onClear(shift.id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Clear shift
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
