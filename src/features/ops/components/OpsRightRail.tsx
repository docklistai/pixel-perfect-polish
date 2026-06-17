import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/dl";
import { opsHandoverNotes, opsFollowUps, opsQuickRef } from "../data/opsDemoData";
import { toast } from "sonner";

export function OpsRightRail() {
  return (
    <div className="col-span-12 lg:col-span-3 space-y-4">
      <Card className="rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-3">Shift handover</h2>
        {opsHandoverNotes.map((h, i) => (
          <div key={i} className="border-l-2 pl-3 py-2 border-brand">
            <div className="text-xs font-semibold">
              {h.from} → {h.to}
            </div>
            <div className="text-[11px] text-muted-foreground">{h.who}</div>
            <p className="text-xs mt-1">{h.note}</p>
            <span
              className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${h.tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}
            >
              {h.tag}
            </span>
          </div>
        ))}
      </Card>

      <Card className="rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-3">
          Urgent follow-ups{" "}
          <span className="ml-1 rounded bg-warning-soft text-warning text-[11px] px-1">
            {opsFollowUps.length}
          </span>
        </h2>
        {opsFollowUps.map((f) => (
          <div key={f.t} className="flex gap-3 py-2 border-t first:border-t-0 border-border">
            <AlertTriangle
              className={`h-4 w-4 mt-0.5 shrink-0 ${f.tone === "danger" ? "text-danger" : "text-warning"}`}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{f.t}</div>
              <div className="text-[11px] text-muted-foreground">{f.w}</div>
            </div>
            <span
              className={`text-[11px] font-semibold shrink-0 ${f.tone === "danger" ? "text-danger" : "text-warning"}`}
            >
              {f.p}
            </span>
          </div>
        ))}
      </Card>

      <Card className="rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-3">Quick reference</h2>
        <div className="grid grid-cols-2 gap-2">
          {opsQuickRef.map((q) => (
            <button
              type="button"
              key={q.t}
              onClick={() =>
                toast.info(q.t, { description: "Reference preview opened for Harbour View Hotel." })
              }
              className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 text-xs"
            >
              <q.icon
                className={`h-3.5 w-3.5 shrink-0 ${q.tone === "danger" ? "text-danger" : "text-brand"}`}
                aria-hidden="true"
              />{" "}
              {q.t}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
