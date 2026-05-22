import type { ReactNode } from "react";
import { Card } from "@/components/dl";

interface ReviewBlockProps {
  title: string;
  verdict: string;
  badge?: ReactNode;
  children?: ReactNode;
}

/**
 * Reusable review surface: a heading, an optional status badge, a one-line
 * plain-English verdict, and optional review rows. Presentational only — it
 * holds no logic and mutates nothing.
 */
export function ReviewBlock({ title, verdict, badge, children }: ReviewBlockProps) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{verdict}</p>
      {children && <div className="mt-3">{children}</div>}
    </Card>
  );
}
