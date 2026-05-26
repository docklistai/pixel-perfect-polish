import * as React from "react";
import { Sparkles, ChevronRight, type LucideIcon } from "lucide-react";
import { AiChip } from "./AiChip";

type ProtoTone = "teal" | "amber" | "purple" | "blue" | "red" | "green";

export interface AiReviewItem {
  title: React.ReactNode;
  body: React.ReactNode;
  tone?: ProtoTone;
  icon?: LucideIcon;
  action?: { label: string; onClick?: () => void };
}

/** AI review panel — multiple checkpoint items. Matches prototype AIReviewPanel. */
export function AiReviewPanel({
  title = "Things to check before publishing",
  meta = "Based on this week's rota, leave, and labour data",
  items,
  footer,
}: {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  items: AiReviewItem[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div
        className="card-section flex items-center gap-3"
        style={{
          background: "linear-gradient(180deg, var(--st-teal-bg), transparent 100%)",
          borderBottom: "1px solid var(--border-faint)",
        }}
      >
        <div className="bubble teal" style={{ width: 32, height: 32 }} aria-hidden>
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold" style={{ fontSize: 13 }}>
            {title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--ink-500)" }}>
            {meta}
          </div>
        </div>
        <AiChip size="sm" />
      </div>
      <div className="flex flex-col">
        {items.map((it, i) => {
          const tone = it.tone ?? "amber";
          const Icon = it.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-3"
              style={{
                padding: "12px 16px",
                borderTop: i ? "1px solid var(--border-faint)" : 0,
              }}
            >
              <div
                className={`bubble ${tone}`}
                style={{ width: 26, height: 26, flex: "0 0 26px" }}
                aria-hidden
              >
                {Icon ? <Icon className="h-3 w-3" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{it.title}</div>
                <div className="text-xs mt-1" style={{ color: "var(--ink-500)", lineHeight: 1.5 }}>
                  {it.body}
                </div>
              </div>
              {it.action && (
                <button type="button" className="btn ghost sm" onClick={it.action.onClick}>
                  {it.action.label} <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {footer && <div className="card-foot flex items-center gap-2">{footer}</div>}
    </div>
  );
}
