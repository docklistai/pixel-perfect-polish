import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  FileText,
  Upload,
  CalendarOff,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";
import { ActionButton, Card, IconButton, StatusBadge, type Tone } from "@/components/dl";
import type { StaffProfile } from "../../types";

interface StaffProfileHeaderProps {
  profile: StaffProfile;
}

function statusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "On Leave") return "purple";
  if (status === "Probation") return "info";
  return "muted";
}

export function StaffProfileHeader({ profile }: StaffProfileHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        to="/staff"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Staff
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <img
              src={`https://i.pravatar.cc/96?img=${profile.img}`}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-border ring-offset-2 ring-offset-background shrink-0"
              alt=""
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
              <div className="text-sm text-muted-foreground mt-1.5">
                {profile.role}
                {profile.sub ? ` · ${profile.sub}` : ""} · {profile.dept}
              </div>
              <div className="mt-2.5">
                <StatusBadge tone={statusTone(profile.status)} dot>
                  {profile.status}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ActionButton size="sm" variant="secondary" icon={MessageCircle}>
              Message
            </ActionButton>
            <ActionButton size="sm" variant="secondary" icon={FileText}>
              Add note
            </ActionButton>
            <ActionButton size="sm" variant="secondary" icon={Upload}>
              Upload document
            </ActionButton>
            <ActionButton size="sm" icon={CalendarOff}>
              Record absence
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" variant="outline" />
          </div>
        </div>
      </Card>
    </div>
  );
}
