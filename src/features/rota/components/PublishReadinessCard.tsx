import { Send, Share2, Download } from "lucide-react";
import { Card, StatusBadge, ActionButton } from "@/components/dl";

export function PublishReadinessCard({
  published,
  conflictCount,
  onPublish,
}: {
  published: boolean;
  conflictCount: number;
  onPublish: () => void;
}) {
  const checks = [
    { k: "Shifts assigned", v: "24 / 27", ok: true },
    { k: "Coverage target", v: "98%", ok: true },
    {
      k: "Conflicts resolved",
      v: conflictCount === 0 ? "All" : `0 / ${conflictCount}`,
      ok: conflictCount === 0,
    },
    { k: "Budget check", v: "On track", ok: true },
  ];

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Publish readiness</div>
        <StatusBadge tone={published ? "success" : "warning"}>
          {published ? "Published" : "Draft"}
        </StatusBadge>
      </div>
      <div className="space-y-2">
        {checks.map(({ k, v, ok }) => (
          <div key={k} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span className={ok ? "text-success" : "text-danger"}>{ok ? "✓" : "✗"}</span>
              {k}
            </span>
            <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
      <ActionButton
        className="mt-4 w-full"
        icon={Send}
        onClick={() => !published && onPublish()}
        disabled={published}
      >
        {published ? "Published" : "Publish to staff"}
      </ActionButton>
      <ActionButton className="mt-2 w-full" variant="secondary" icon={Share2} disabled>
        Share draft
      </ActionButton>
      <ActionButton className="mt-2 w-full" variant="ghost" icon={Download} disabled>
        Export PDF
      </ActionButton>
    </Card>
  );
}
