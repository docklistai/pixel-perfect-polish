import * as React from "react";
import { Check, Info, X } from "lucide-react";
import { SectionCard } from "./SettingsPrimitives";

function NotificationMatrixRow({
  event,
  defaults,
  onDirty,
}: {
  event: string;
  defaults: boolean[];
  onDirty: () => void;
}) {
  const [values, setValues] = React.useState(defaults);
  const toggle = (index: number) => {
    const next = [...values];
    next[index] = !next[index];
    setValues(next);
    onDirty();
  };

  return (
    <tr className="border-b border-border hover:bg-muted/10">
      <td className="py-2.5 text-xs font-medium text-foreground">{event}</td>
      {values.map((value, index) => (
        <td key={index} className="py-2.5 text-center">
          <button
            type="button"
            aria-label={`${event}: ${value ? "enabled" : "disabled"}`}
            onClick={() => toggle(index)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-muted"
          >
            {value ? (
              <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </button>
        </td>
      ))}
    </tr>
  );
}

const ROWS: Array<{ event: string; defaults: boolean[] }> = [
  { event: "New leave request", defaults: [true, true, true, false] },
  { event: "Leave request approved/declined", defaults: [true, true, true, false] },
  { event: "Timesheet ready to approve", defaults: [true, false, true, false] },
  { event: "Timesheet flagged", defaults: [true, true, true, false] },
  { event: "Rota published", defaults: [true, true, true, true] },
  { event: "Rota draft changed", defaults: [false, false, true, false] },
  { event: "Missed clock-in", defaults: [true, true, true, false] },
  { event: "Announcement acknowledgement", defaults: [true, false, true, false] },
  { event: "Handover note posted", defaults: [true, true, true, false] },
  { event: "Document expiring (30 days)", defaults: [true, false, true, false] },
];

export function NotificationMatrixSettings({ onDirty }: { onDirty: () => void }) {
  return (
    <SectionCard
      title="Notification matrix"
      description="Preview channel preferences; live in-app workflow updates remain automatic."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Event
              </th>
              {["Manager Email", "Staff App", "In-App", "Phone (Preview)"].map((heading) => (
                <th
                  key={heading}
                  className="w-24 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <NotificationMatrixRow key={row.event} {...row} onDirty={onDirty} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2.5 rounded-2xl border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Published rota updates and request decisions are delivered in-app to affected recipients
          today. Email, phone, and other configurable channels remain preview settings.
        </p>
      </div>
    </SectionCard>
  );
}
