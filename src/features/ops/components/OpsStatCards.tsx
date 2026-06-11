import { MetricCard } from "@/components/dl";
import type { Tone } from "@/components/dl";
import { opsStats } from "../data/opsDemoData";

export function OpsStatCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-5">
      {opsStats.map((s) => (
        <MetricCard
          key={s.l}
          icon={s.icon}
          label={s.l}
          value={s.v}
          tone={s.tone as Tone}
          sub={s.danger ? <span className="text-warning">{s.s}</span> : s.s}
        />
      ))}
    </div>
  );
}
