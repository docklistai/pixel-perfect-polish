import { Card } from "@/components/dl";

const performers = [
  { name: "Sophie Carter", role: "FOH Supervisor", score: 98, tone: "av-c1" },
  { name: "Daniel Mitchell", role: "Kitchen Supervisor", score: 96, tone: "av-c4" },
  { name: "Priya Patel", role: "Head Chef", score: 94, tone: "av-c3" },
  { name: "Liam O'Connor", role: "Bartender", score: 92, tone: "av-c2" },
  { name: "Amelia Stone", role: "Housekeeper", score: 89, tone: "av-c5" },
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
      <div className="mb-3 text-sm font-semibold">Top performers</div>
      <div className="space-y-3">
        {performers.map((performer, index) => (
          <div key={performer.name} className="row gap-3" style={{ alignItems: "center" }}>
            <div className="strong muted" style={{ width: 18 }}>
              {index + 1}
            </div>
            <div className={`av ${performer.tone} sm`}>{initials(performer.name)}</div>
            <div className="grow">
              <div className="strong txt-md">{performer.name}</div>
              <div className="muted txt-xs">{performer.role}</div>
            </div>
            <div className="strong">{performer.score}%</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
