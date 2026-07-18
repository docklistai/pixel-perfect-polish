import * as React from "react";
import { Check, Copy } from "lucide-react";
import type { IssuePortalCodeResult } from "../types";

function CodeReveal({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--st-teal-line)] bg-[var(--st-teal-bg)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <code className="flex-1 select-all font-mono text-base font-semibold tracking-[0.18em] text-[var(--st-teal-ink)]">
          {code}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--st-teal-line)] px-2.5 text-xs font-semibold text-[var(--st-teal-ink)] transition-colors hover:bg-background/40"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--st-teal-ink)]/80">
        Shown once — copy it now. Issuing again replaces it.
      </p>
    </div>
  );
}

export function PortalCodeResult({ result }: { result: IssuePortalCodeResult | null }) {
  if (!result) return null;
  if (result.ok) return <CodeReveal code={result.code} />;
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
    >
      <p>{result.message}</p>
      {result.referenceId && <p className="mt-1 font-mono">Reference: {result.referenceId}</p>}
    </div>
  );
}
