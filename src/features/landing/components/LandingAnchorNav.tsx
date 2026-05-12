import * as React from "react";
import { cn } from "@/lib/utils";

interface AnchorItem {
  label: string;
  href: string;
}

interface LandingAnchorNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items: AnchorItem[];
  eyebrow?: string;
}

export function LandingAnchorNav({ items, eyebrow, className, ...props }: LandingAnchorNavProps) {
  if (!items.length) return null;

  return (
    <div
      {...props}
      className={cn(
        "mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2",
        "overflow-x-auto rounded-[1.6rem] border border-border/20 p-3",
        "bg-background/80 shadow-[0_18px_60px_color-mix(in_oklch,var(--foreground)_6%,transparent)]",
        "supports-[backdrop-filter]:bg-background/60 backdrop-blur-xl",
        "text-xs sm:text-sm md:justify-start",
        className,
      )}
    >
      {eyebrow ? (
        <span className="mr-2 whitespace-nowrap rounded-full border border-border/30 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground sm:text-[11px]">
          {eyebrow}
        </span>
      ) : null}
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap rounded-full border border-brand/25 bg-background/80 px-3 py-1",
            "font-semibold uppercase tracking-wide text-foreground/85",
            "transition-all duration-300 hover:-translate-y-0.5",
            "hover:border-brand/45 hover:bg-brand-soft hover:text-foreground",
            "hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]",
          )}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
