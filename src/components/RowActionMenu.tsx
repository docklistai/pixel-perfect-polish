/**
 * Anchored action menu for row/header "..." triggers. Wraps Radix
 * DropdownMenu with prototype chrome (`.popover`, `.menu-item`, `.menu-sep`).
 *
 * Items are described declaratively; the primitive contains no business
 * logic. Esc/outside click/keyboard navigation come from Radix.
 */
import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowActionItem =
  | {
      kind?: "item";
      label: string;
      icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      shortcut?: string;
    }
  | { kind: "separator" }
  | { kind: "label"; text: string };

export interface RowActionMenuProps {
  items: RowActionItem[];
  /** Accessible label for the trigger button. Required for screen readers. */
  triggerLabel: string;
  /** Override the default MoreHorizontal trigger. */
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

const TRIGGER_CLS =
  "h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors border border-transparent hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RowActionMenu({
  items,
  triggerLabel,
  trigger,
  align = "end",
  className,
}: RowActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={triggerLabel}
            className={cn(TRIGGER_CLS, className)}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="popover min-w-[220px] p-1"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => {
          if (item.kind === "separator") {
            return <DropdownMenuSeparator key={`sep-${i}`} className="menu-sep" />;
          }
          if (item.kind === "label") {
            return (
              <DropdownMenuLabel key={`label-${i}`} className="menu-label">
                {item.text}
              </DropdownMenuLabel>
            );
          }
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={`${item.label}-${i}`}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn("menu-item", item.danger && "danger")}
            >
              {Icon && <Icon className="ico h-3.5 w-3.5" aria-hidden />}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="kbd ml-auto">{item.shortcut}</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
