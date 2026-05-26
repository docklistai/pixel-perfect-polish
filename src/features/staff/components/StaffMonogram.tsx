import * as React from "react";
import { cn } from "@/lib/utils";

const AVATAR_STYLES = [
  "bg-[linear-gradient(135deg,var(--st-teal-bg),var(--st-teal-line))] text-[var(--st-teal-ink)]",
  "bg-[linear-gradient(135deg,var(--st-green-bg),var(--st-green-line))] text-[var(--st-green-ink)]",
  "bg-[linear-gradient(135deg,var(--st-amber-bg),var(--st-amber-line))] text-[var(--st-amber-ink)]",
  "bg-[linear-gradient(135deg,var(--st-purple-bg),var(--st-purple-line))] text-[var(--st-purple-ink)]",
  "bg-[linear-gradient(135deg,var(--st-blue-bg),var(--st-blue-line))] text-[var(--st-blue-ink)]",
  "bg-[linear-gradient(135deg,var(--st-red-bg),var(--st-red-line))] text-[var(--st-red-ink)]",
];

interface StaffMonogramProps {
  name: string;
  size?: "sm" | "lg" | "xl";
}

const SIZE_CLASS: Record<NonNullable<StaffMonogramProps["size"]>, string> = {
  sm: "size-8 text-xs",
  lg: "size-16 text-base",
  xl: "size-20 text-lg",
};

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffMonogram({ name, size = "sm" }: StaffMonogramProps) {
  const colorCls = AVATAR_STYLES[name.charCodeAt(0) % AVATAR_STYLES.length];

  return (
    <div
      className={cn(
        SIZE_CLASS[size],
        colorCls,
        "shrink-0 rounded-full flex items-center justify-center font-bold ring-1 ring-border/50",
      )}
      aria-hidden
    >
      {initialsFor(name)}
    </div>
  );
}
