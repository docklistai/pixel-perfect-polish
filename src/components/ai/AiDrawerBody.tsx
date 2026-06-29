import { ArrowRight, Info } from "lucide-react";
import type { SupportRoute, SupportTopic } from "./aiDrawerData";

/**
 * Bounded manager-support body. Renders a fixed set of deterministic review
 * topics built from live workspace counts, each routing into a real screen.
 * There is no free-text input, no simulated thinking, and no history — the
 * assistant only summarises counts and points the manager at the right page.
 */
export function AiDrawerBody({
  topics,
  onGoTo,
  statusMessage,
}: {
  topics: SupportTopic[];
  onGoTo: (route: SupportRoute) => void;
  statusMessage: string;
}) {
  return (
    <>
      <div
        className="flex items-start gap-2 rounded-xl border p-3 text-xs"
        style={{
          background: "var(--bg-raised)",
          borderColor: "var(--border)",
          color: "var(--ink-500)",
        }}
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{statusMessage}</span>
      </div>

      <div className="section-label mt-4 mb-2">Manager support</div>
      <div className="flex flex-col gap-2">
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <div
              key={topic.id}
              className="flex items-start gap-3"
              style={{
                padding: "12px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--bg-raised)",
              }}
            >
              <div
                className="bubble teal"
                style={{ width: 26, height: 26, flex: "0 0 26px" }}
                aria-hidden
              >
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">{topic.label}</div>
                <div className="text-xs mt-1" style={{ color: "var(--ink-500)", lineHeight: 1.5 }}>
                  {topic.note}
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--st-teal-ink)", background: "transparent", border: 0 }}
                  onClick={() => onGoTo(topic.route)}
                >
                  {topic.routeLabel}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
