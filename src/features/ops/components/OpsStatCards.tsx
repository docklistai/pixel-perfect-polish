import { MetricCard } from "@/components/dl";
import type { Tone } from "@/components/dl";
import { opsStats } from "../data/opsDemoData";

export function OpsStatCards() {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {opsStats.map((s) => (
        <MetricCard
          key={s.l}
          icon={s.icon}
          label={s.l}
          value={s.v}
          tone={s.tone as Tone}
          sub={s.danger ? <span className="text-warning">{s.s}</span> : s.s}
          className="min-h-[116px]"
        />
      ))}
    </div>
  );
}
