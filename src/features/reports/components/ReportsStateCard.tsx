import { AlertTriangle, BarChart3, Loader2 } from "lucide-react";
import { Card } from "@/components/dl";

export function ReportsStateCard({ state }: { state: "loading" | "error" | "empty" }) {
  const content = {
    loading: {
      title: "Loading Reports",
      body: "Reading the latest published rota snapshots for this workspace.",
      icon: Loader2,
      className: "animate-spin text-brand",
    },
    error: {
      title: "Reports could not be loaded",
      body: "No sample data is shown. Refresh the page to retry the live report.",
      icon: AlertTriangle,
      className: "text-warning",
    },
    empty: {
      title: "No operational activity in this period",
      body: "Unpublished rota weeks remain visible below. Publish a rota or record time and leave activity to populate the report.",
      icon: BarChart3,
      className: "text-muted-foreground",
    },
  }[state];
  const Icon = content.icon;
  return (
    <Card className="mb-5 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${content.className}`} aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">{content.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{content.body}</p>
        </div>
      </div>
    </Card>
  );
}
