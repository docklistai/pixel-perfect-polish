import { Card } from "@/components/dl";
import type { AnnouncementItem } from "../types";

interface Props {
  items: AnnouncementItem[];
}

export function DashboardAnnouncements({ items }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5">
        <div className="dock-section-eyebrow">Recent announcements</div>
      </div>
      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
        No recent announcements.
      </div>
    </Card>
  );
}
