import { Megaphone } from "lucide-react";
import { Card } from "@/components/dl";
import type { AnnouncementItem } from "../types";
import { toneBg } from "../types";

interface Props {
  items: AnnouncementItem[];
}

export function DashboardAnnouncements({ items }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5">
        <div className="dock-section-eyebrow">Recent announcements</div>
      </div>
      <div className="divide-y divide-border">
        {items.map((a) => (
          <div key={a.t} className="flex gap-3 px-5 py-3.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] ${toneBg[a.tone]}`}
            >
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{a.t}</div>
              <div className="text-xs text-muted-foreground">{a.s}</div>
            </div>
            <div className="whitespace-nowrap text-[11px] text-muted-foreground">{a.a}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
