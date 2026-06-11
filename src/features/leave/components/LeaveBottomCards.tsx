import { Card } from "@/components/dl";
import { AlertTriangle } from "lucide-react";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

const outThisWeek = [
  {
    name: "Priya Patel",
    dates: "11 Jun only",
    type: "Unavailable",
    tone: "av-c3",
    badge: "red" as const,
  },
];

const publicHolidays = [
  { d: "31 Aug", name: "Summer bank holiday", flag: true },
  { d: "25 Dec", name: "Christmas Day" },
  { d: "28 Dec", name: "Boxing Day (substitute)" },
];

const balances: { name: string; tone: string; used: number; total: number }[] = [
  { name: "Sophie Carter", tone: "av-c1", used: 13, total: 28 },
  { name: "Daniel Mitchell", tone: "av-c2", used: 8, total: 28 },
  { name: "Priya Patel", tone: "av-c3", used: 14, total: 22 },
  { name: "Liam O'Connor", tone: "av-c4", used: 5, total: 22 },
];

export function LeaveBottomCards() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Card className="card-pad">
        <div className="section-label mb-2">Out this week</div>
        <div className="flex flex-col gap-3 mt-2">
          {outThisWeek.map((p) => (
            <div key={p.name} className="row gap-3">
              <div className={`av ${p.tone} sm`}>{initials(p.name)}</div>
              <div className="grow min-w-0">
                <div className="strong txt-sm truncate">{p.name}</div>
                <div className="muted txt-xs mono">
                  {p.dates} · {p.type}
                </div>
              </div>
              <span className={`badge ${p.badge}`}>{p.type}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="card-pad">
        <div className="section-label mb-2">Public holidays</div>
        <div className="flex flex-col gap-3 mt-2">
          {publicHolidays.map((h) => (
            <div key={h.d} className="row gap-3">
              <span className="mono muted txt-sm" style={{ width: 64 }}>
                {h.d}
              </span>
              <span className="grow strong txt-sm">{h.name}</span>
              {h.flag && (
                <span className="badge solid-amber inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Plan
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="card-pad">
        <div className="section-label mb-2">Team leave balances</div>
        <div className="flex flex-col gap-2 mt-2">
          {balances.map((b) => {
            const pct = Math.round((b.used / b.total) * 100);
            return (
              <div key={b.name} className="row gap-3 txt-sm">
                <div className={`av ${b.tone} xs`}>{initials(b.name)}</div>
                <span className="grow truncate">{b.name}</span>
                <span className="bar" style={{ width: 90 }}>
                  <i
                    style={{
                      width: `${pct}%`,
                      background: pct > 80 ? "var(--amber-500)" : "var(--teal-500)",
                    }}
                  />
                </span>
                <span className="mono muted">
                  {b.used}/{b.total}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
