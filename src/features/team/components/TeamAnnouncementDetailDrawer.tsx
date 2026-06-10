import * as React from "react";
import { DrawerShell, ActionButton, StatusBadge, DialogShell } from "@/components/dl";
import { Bell, Check, Download, Users, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import type { TeamAnnouncement } from "../types";

interface Props {
  announcement: TeamAnnouncement | null;
  onOpenChange: (open: boolean) => void;
}

interface Comment {
  name: string;
  body: string;
  when: string;
  avatarColor: string;
}

function Avatar({
  name,
  size = "sm",
  colorClass,
}: {
  name: string;
  size?: "sm" | "md";
  colorClass?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const sizeCls = size === "sm" ? "sm" : "";
  return (
    <div className={`av ${sizeCls} ${colorClass || "av-c2"}`} aria-hidden>
      {initials}
    </div>
  );
}

export function TeamAnnouncementDetailDrawer({ announcement, onOpenChange }: Props) {
  const [comments, setComments] = React.useState<Comment[]>([
    {
      name: "Daniel Mitchell",
      body: "Got it — I'll print the new menu before service.",
      when: "2h ago",
      avatarColor: "av-c1",
    },
    {
      name: "Sophie Carter",
      body: "Will brief the FOH team at handover.",
      when: "3h ago",
      avatarColor: "av-c3",
    },
    {
      name: "Liam O'Connor",
      body: "Any update on the cocktail station?",
      when: "5h ago",
      avatarColor: "av-c4",
    },
  ]);
  const [newComment, setNewComment] = React.useState("");
  const [showAckList, setShowAckList] = React.useState(false);
  const [acked, setAcked] = React.useState(false);

  React.useEffect(() => {
    if (announcement) {
      setAcked(false);
    }
  }, [announcement]);

  if (!announcement) return null;

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      {
        name: "Alex Thompson",
        body: newComment.trim(),
        when: "Just now",
        avatarColor: "av-c2",
      },
    ]);
    setNewComment("");
    toast.success("Comment saved", {
      description: "Your comment is visible to managers only",
    });
  };

  const handleAcknowledge = () => {
    setAcked(true);
    toast.success("Acknowledged", {
      description: "Your acknowledgement is recorded",
    });
  };

  const handleRemindNonReaders = () => {
    toast.info("Reminder prepared", {
      description: "Reminder draft ready for staff who haven't acknowledged",
    });
  };

  const handleExportAcks = () => {
    const filename = `${announcement.t.split(" ").slice(0, 2).join("-").toLowerCase()}_acks.csv`;
    toast.success("Exported", {
      description: `${filename} ready`,
    });
  };

  return (
    <>
      <DrawerShell
        open={announcement !== null}
        onOpenChange={(o) => !o && onOpenChange(false)}
        title={announcement.t}
        description="Published 2d ago · By Alex Thompson"
        meta={<StatusBadge tone="brand">Announcement</StatusBadge>}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              icon={Bell}
              onClick={handleRemindNonReaders}
            >
              Remind non-readers
            </ActionButton>
            <ActionButton size="sm" icon={Check} onClick={handleAcknowledge} disabled={acked}>
              {acked ? "Acknowledged" : "Acknowledge"}
            </ActionButton>
          </div>
        }
        width="lg"
      >
        <div className="space-y-5">
          {/* Announcement Message Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-soft text-brand shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{announcement.t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Published 2d ago</div>
              </div>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed bg-muted/10 p-3.5 border border-border/50 rounded-xl">
              {announcement.body}
            </p>
          </div>

          {/* Acknowledgements Status Card */}
          <div className="card p-4 space-y-3.5 bg-muted/20 border border-border rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Read status
              </div>
              <span className="text-sm font-bold text-foreground">
                {announcement.ackDone} / {announcement.ackTotal}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: `${(announcement.ackDone / announcement.ackTotal) * 100}%` }}
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <ActionButton
                variant="secondary"
                size="sm"
                icon={Users}
                onClick={() => setShowAckList(true)}
              >
                See who
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={handleExportAcks}
              >
                Export
              </ActionButton>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comments ({comments.length})
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {comments.map((c, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 bg-muted/25 border border-border/60 rounded-xl items-start"
                >
                  <Avatar name={c.name} size="sm" colorClass={c.avatarColor} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">· {c.when}</span>
                    </div>
                    <div className="text-xs text-muted-foreground/90">{c.body}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="flex gap-2 items-center bg-card border border-input rounded-xl p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-2" />
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Reply to all (managers only)..."
                className="flex-1 bg-transparent border-0 outline-none text-xs px-2 placeholder:text-muted-foreground/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendComment();
                }}
              />
              <button
                type="button"
                onClick={handleSendComment}
                disabled={!newComment.trim()}
                className="p-1.5 rounded-lg text-brand hover:bg-brand-soft/20 disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </DrawerShell>

      {/* See Who Modal */}
      <DialogShell
        open={showAckList}
        onOpenChange={setShowAckList}
        icon={Users}
        iconTone="brand"
        title="Acknowledgement details"
        description={`${announcement.ackDone} of ${announcement.ackTotal} staff have acknowledged this announcement.`}
        size="md"
        footer={
          <ActionButton size="sm" onClick={() => setShowAckList(false)}>
            Done
          </ActionButton>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Acknowledged ({announcement.ackDone})
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Sophie Carter", role: "FOH Supervisor" },
                { name: "Daniel Mitchell", role: "FOH Team Leader" },
                { name: "Priya Patel", role: "Kitchen Supervisor" },
                { name: "Jack Harrison", role: "FOH Staff" },
                { name: "Chloe Wood", role: "Housekeeping" },
                { name: "James Bennett", role: "Bar Staff" },
              ].map((staff) => (
                <div
                  key={staff.name}
                  className="flex items-center gap-2 p-2 bg-muted/10 border border-border/40 rounded-lg"
                >
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{staff.name}</div>
                    <div className="text-[10px] text-muted-foreground">{staff.role}</div>
                  </div>
                </div>
              ))}
              <div className="col-span-2 text-center text-[10px] text-muted-foreground italic py-1">
                +9 more team members
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Pending ({announcement.ackTotal - announcement.ackDone})
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Liam O'Connor", role: "Maintenance Lead" },
                { name: "Emma Johnson", role: "Bar Manager" },
                { name: "Olivia Bennett", role: "Housekeeping Lead" },
              ].map((staff) => (
                <div
                  key={staff.name}
                  className="flex items-center gap-2 p-2 bg-muted/10 border border-border/40 rounded-lg"
                >
                  <div className="h-3.5 w-3.5 rounded-full border border-warning shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{staff.name}</div>
                    <div className="text-[10px] text-muted-foreground">{staff.role}</div>
                  </div>
                </div>
              ))}
              <div className="col-span-2 text-center text-[10px] text-muted-foreground italic py-1">
                +6 more team members
              </div>
            </div>
          </div>
        </div>
      </DialogShell>
    </>
  );
}
