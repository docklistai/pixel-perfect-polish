import { Card } from "@/components/dl";

const rotaSignals = [
  { name: "Sophie Carter", role: "FOH coverage", signal: "Strong", tone: "av-c1" },
  { name: "Daniel Mitchell", role: "Kitchen cover", signal: "Strong", tone: "av-c4" },
  { name: "Priya Patel", role: "Prep cover", signal: "Stable", tone: "av-c3" },
  { name: "Liam O'Connor", role: "Bar cover", signal: "Stable", tone: "av-c2" },
  { name: "Amelia Stone", role: "Housekeeping cover", signal: "Watch", tone: "av-c5" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function ReportsTopPerformersCard() {
  return (
    <Card className="col-span-12 lg:col-span-4 p-4 lg:p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold">Sample rota-fit signals</div>
        <div className="text-xs text-muted-foreground">
          Illustrative coverage prompts, not HR scoring.
        </div>
      </div>
      <div className="space-y-3">
        {rotaSignals.map((signal, index) => (
          <div key={signal.name} className="row gap-3" style={{ alignItems: "center" }}>
            <div className="strong muted" style={{ width: 18 }}>
              {index + 1}
            </div>
            <div className={`av ${signal.tone} sm`}>{initials(signal.name)}</div>
            <div className="grow">
              <div className="strong txt-md">{signal.name}</div>
              <div className="muted txt-xs">{signal.role}</div>
            </div>
            <div className="strong">{signal.signal}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
