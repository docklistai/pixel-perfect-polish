import * as React from "react";

const AVATAR_COLORS = [
  "bg-brand-soft text-brand",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-accent-purple-soft text-accent-purple",
  "bg-info-soft text-info",
  "bg-danger-soft text-danger",
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
  const colorCls = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div
      className={`${SIZE_CLASS[size]} ${colorCls} shrink-0 rounded-full flex items-center justify-center font-bold ring-1 ring-border/50`}
      aria-hidden
    >
      {initialsFor(name)}
    </div>
  );
}
