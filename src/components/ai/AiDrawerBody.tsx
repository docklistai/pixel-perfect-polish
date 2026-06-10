import { ArrowRight, Clock, CheckCircle2, Info, Plus, X, Sparkles } from "lucide-react";
import { AiChip } from "./AiChip";
import { HISTORY, QUICK_PROMPTS, type Phase, type SimulatedAnswer } from "./aiDrawerData";

export function AiDrawerBody({
  input,
  phase,
  answer,
  onInputChange,
  onRun,
  onReset,
  onOpenChange,
}: {
  input: string;
  phase: Phase;
  answer: SimulatedAnswer | null;
  onInputChange: (value: string) => void;
  onRun: (query: string) => void;
  onReset: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const canAsk = Boolean(input.trim()) && phase !== "running";
  const promptValue = input.trim();

  return (
    <>
      <div className="card" style={{ background: "var(--bg-raised)" }}>
        <div className="card-section">
          <div className="section-label" style={{ marginBottom: 8 }}>
            Ask the assistant
          </div>
          <div className="input-group" style={{ padding: "10px 12px" }}>
            <Sparkles className="ico h-3.5 w-3.5" aria-hidden />
            <input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Ask about this week's rota, labour, leave, team…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && promptValue) onRun(promptValue);
              }}
            />
            <button
              type="button"
              className="btn primary sm"
              disabled={!canAsk}
              onClick={() => promptValue && onRun(promptValue)}
            >
              {phase === "running" ? "Thinking…" : "Ask"}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--ink-500)" }}>
            <Info className="h-3 w-3" />
            Suggestions only — nothing is shared with staff until you act on them.
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <>
          <div className="section-label mt-4 mb-2">Try a prompt</div>
          <div className="flex flex-col gap-2">
            {QUICK_PROMPTS.map((p, i) => {
              const Icon = p.icon;
              return (
                <button
                  key={i}
                  type="button"
                  className="flex items-center gap-3 text-left"
                  onClick={() => onRun(p.label)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    background: "var(--bg-raised)",
                    cursor: "pointer",
                  }}
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--st-teal-ink)" }}
                    aria-hidden
                  />
                  <span className="text-sm flex-1">{p.label}</span>
                  <ArrowRight className="h-3 w-3" style={{ color: "var(--ink-500)" }} aria-hidden />
                </button>
              );
            })}
          </div>

          <div className="section-label mt-4 mb-2">Recent</div>
          <div className="flex flex-col gap-2">
            {HISTORY.map((h, i) => (
              <button
                key={i}
                type="button"
                className="flex items-center gap-3 text-left"
                onClick={() => onRun(h.q)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "transparent",
                  border: 0,
                  width: "100%",
                }}
              >
                <div className="bubble slate" style={{ width: 26, height: 26 }} aria-hidden>
                  <Clock className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{h.q}</div>
                  <div className="text-xs" style={{ color: "var(--ink-500)" }}>
                    {h.when}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "running" && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <AiChip size="sm" />
            <span className="text-xs" style={{ color: "var(--ink-500)" }}>
              Reviewing your data…
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="skel" style={{ height: 12, width: "70%" }} />
            <div className="skel" style={{ height: 12, width: "94%" }} />
            <div className="skel" style={{ height: 12, width: "86%" }} />
            <div className="skel" style={{ height: 12, width: "78%" }} />
            <div className="skel" style={{ height: 12, width: "55%" }} />
          </div>
        </div>
      )}

      {phase === "answered" && answer && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <AiChip size="sm" />
            <span className="text-xs truncate" style={{ color: "var(--ink-500)", maxWidth: 280 }}>
              In response to "{input}"
            </span>
            <div className="flex-1" />
            <button type="button" className="btn ghost sm" onClick={onReset}>
              <Plus className="h-3 w-3" /> New
            </button>
          </div>
          <div className="card" style={{ background: "var(--bg-raised)" }}>
            <div className="card-section">
              <div className="font-semibold text-sm mb-2" style={{ color: "var(--ink-900)" }}>
                {answer.title}
              </div>
              <div className="text-sm" style={{ color: "var(--ink-500)", lineHeight: 1.6 }}>
                {answer.summary}
              </div>
              {answer.bullets && (
                <div className="flex flex-col gap-2 mt-3">
                  {answer.bullets.map((b, i) => {
                    const Icon = b.icon;
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className={`bubble ${b.tone ?? "teal"}`}
                          style={{ width: 22, height: 22, flex: "0 0 22px" }}
                          aria-hidden
                        >
                          {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{b.title}</div>
                          <div
                            className="text-xs mt-1"
                            style={{ color: "var(--ink-500)", lineHeight: 1.5 }}
                          >
                            {b.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {answer.actions && (
                <div className="flex items-center gap-2 mt-3">
                  {answer.actions.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`btn sm ${a.primary ? "outline-teal" : "ghost"}`}
                        onClick={() => onOpenChange(false)}
                      >
                        {Icon ? <Icon className="h-3 w-3" /> : null}
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: "var(--ink-500)" }}>
            <Info className="h-3 w-3" />
            The assistant only shows you suggestions — you decide what to do.
            <div className="flex-1" />
            <button
              type="button"
              className="flex items-center gap-1"
              style={{ color: "var(--st-teal-ink)", background: "transparent", border: 0 }}
            >
              <CheckCircle2 className="h-3 w-3" /> Helpful
            </button>
            <button
              type="button"
              className="flex items-center gap-1"
              style={{ color: "var(--st-teal-ink)", background: "transparent", border: 0 }}
            >
              <X className="h-3 w-3" /> Not helpful
            </button>
          </div>
        </div>
      )}
    </>
  );
}
