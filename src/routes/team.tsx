import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  IconButton,
  DrawerShell,
  FormSection,
  FormRow,
  StatusBadge,
  EmptyState,
} from "@/components/dl";
import {
  Megaphone,
  Pin,
  MoreHorizontal,
  Trophy,
  Shield,
  Clock,
  AlertCircle,
  Shirt,
  GraduationCap,
  Wine,
  Cake,
  ArrowRight,
  MapPin,
  Users,
  Filter,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — Docklist" }] }),
  component: TeamPage,
});

const top = [
  {
    v: "5",
    l: "Unread announcements",
    s: "2 require your acknowledgement",
    icon: Megaphone,
    tone: "purple",
  },
  {
    v: "2",
    l: "Acknowledgements required",
    s: "Across 2 announcements",
    icon: Shield,
    tone: "warning",
  },
  { v: "7", l: "Recent updates", s: "Since your last visit", icon: ArrowRight, tone: "success" },
];
const toneBg: Record<string, string> = {
  purple: "bg-accent-purple-soft text-accent-purple",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
};

const announcements = [
  {
    pinned: true,
    t: "Summer Menu Launch",
    emoji: "☀️",
    body: "We're excited to launch our new summer menu from Monday 19 May. Please take time to familiarise yourself with the new dishes, ingredients...",
    tags: ["All Staff", "Restaurant, Bar, Kitchen"],
    ack: "18 / 24",
    date: "16 May 2025",
    icon: Cake,
    tone: "purple",
  },
  {
    pinned: true,
    t: "Food Safety Refresher",
    emoji: "🛡",
    body: "A friendly reminder to complete your Food Safety Refresher module by 31 May. This short training helps us keep...",
    tags: ["Kitchen, FOH", "All Locations"],
    ack: "14 / 18",
    date: "14 May 2025",
    icon: Shield,
    tone: "warning",
  },
  {
    t: "Bank Holiday: Opening Hours",
    emoji: "📅",
    body: "Please note our opening hours for the upcoming bank holiday on Monday 26 May.",
    tags: ["All Staff"],
    ack: "24 / 24",
    date: "12 May 2025",
    icon: Clock,
    tone: "info",
  },
  {
    t: "Team Shout-Outs",
    emoji: "👏",
    body: "Big thanks to everyone for a fantastic week! Your hard work and positive energy are what make Harbour View special.",
    tags: ["All Staff", "All Locations"],
    ack: "22 / 24",
    date: "9 May 2025",
    icon: Trophy,
    tone: "purple",
  },
  {
    t: "Uniform Update",
    emoji: "👕",
    body: "New uniform items are now available in all sizes. See Reception to collect yours.",
    tags: ["All Staff"],
    ack: "11 / 24",
    date: "7 May 2025",
    icon: Shirt,
    tone: "danger",
  },
];

function TeamPage() {
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<null | { t: string; s: string }>(null);

  return (
    <AppShell>
      <PageHeader
        title="Team"
        subtitle="Share updates, keep everyone informed and connected."
        actions={
          <>
            <ActionButton icon={Megaphone} onClick={() => setComposeOpen(true)}>
              Compose announcement
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-9 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {top.map((t) => (
              <Card key={t.l} className="rounded-2xl p-4 flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${toneBg[t.tone]}`}
                >
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{t.v}</span>
                    <span className="text-sm">{t.l}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.s}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl">
            <div className="flex items-center justify-between px-5 pt-4">
              <div className="flex gap-5 text-sm">
                <button className="pb-3 border-b-2 border-brand text-brand font-semibold">
                  All announcements
                </button>
                <button className="pb-3 text-muted-foreground">Pinned</button>
                <button className="pb-3 text-muted-foreground">My acknowledgements</button>
              </div>
              <div className="flex items-center gap-2 pb-3">
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Filter by audience{" "}
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> All locations{" "}
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button className="rounded-lg border border-border p-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="border-t border-border">
              {announcements.length === 0 ? (
                <EmptyState
                  title="No announcements"
                  description="Posts shared with the team will appear here."
                />
              ) : (
                announcements.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDetail({ t: a.t, s: a.body })}
                    className="block w-full text-left border-b border-border/60 last:border-0 px-5 py-4 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition"
                  >
                    {a.pinned && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-accent-purple-soft text-accent-purple text-[11px] font-medium px-2 py-0.5 mb-2">
                        <Pin className="h-3 w-3" /> Pinned
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${toneBg[a.tone]}`}
                      >
                        <a.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 font-semibold">
                          {a.t} <span>{a.emoji}</span>{" "}
                          {a.t === "Food Safety Refresher" && (
                            <Shield className="h-4 w-4 text-success" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                        <div className="flex gap-2 mt-2">
                          {a.tags.map((tg) => (
                            <span
                              key={tg}
                              className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {tg}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-xs shrink-0">
                        <div className="font-semibold">{a.ack}</div>
                        <div className="text-muted-foreground">Acknowledged</div>
                        <div className="mt-1 h-1 w-24 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-brand"
                            style={{
                              width: `${(parseInt(a.ack) / parseInt(a.ack.split("/")[1])) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="mt-2 text-muted-foreground">
                          Published
                          <br />
                          <span className="text-foreground font-medium">{a.date}</span>
                        </div>
                      </div>
                      <Pin className="h-4 w-4 text-muted-foreground" />
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))
              )}
              {announcements.length > 0 && (
                <button
                  type="button"
                  className="block mx-auto py-4 text-xs text-brand font-semibold"
                >
                  Load more announcements ↓
                </button>
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Upcoming training</div>
              <button type="button" className="text-xs text-brand">
                View all
              </button>
            </div>
            {[
              {
                t: "Upselling Workshop",
                d: "Tue, 20 May · 14:00 – 15:30",
                w: "3 days",
                icon: GraduationCap,
                tone: "info",
              },
              {
                t: "Food Safety Refresher",
                d: "Fri, 23 May · 09:00 – 10:00",
                w: "6 days",
                icon: Shield,
                tone: "warning",
              },
              {
                t: "Cocktail Masterclass",
                d: "Tue, 27 May · 15:00 – 16:30",
                w: "10 days",
                icon: Wine,
                tone: "purple",
              },
            ].map((t) => (
              <div
                key={t.t}
                className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${toneBg[t.tone]}`}
                >
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t.t}</div>
                  <div className="text-[11px] text-muted-foreground">{t.d}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">{t.w}</div>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Birthdays this week</div>
              <button type="button" className="text-xs text-brand">
                View all
              </button>
            </div>
            {[
              { n: "Liam O'Connor", d: "11 May", img: 13 },
              { n: "Olivia Bennett", d: "11 May", img: 16 },
              { n: "Daniel Mitchell", d: "12 May", img: 12 },
            ].map((p) => (
              <div
                key={p.n}
                className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
              >
                <img
                  src={`https://i.pravatar.cc/64?img=${p.img}`}
                  className="h-8 w-8 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.n}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">{p.d}</div>
              </div>
            ))}
            <button type="button" className="mt-2 block text-xs font-semibold text-brand">
              Send a birthday wish →
            </button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Staff events</div>
              <button type="button" className="text-xs text-brand">
                View all
              </button>
            </div>
            {[
              { t: "Team Social", d: "Fri, 23 May · 18:30", w: "5 days", icon: Cake, tone: "info" },
              {
                t: "Wellness Morning",
                d: "Sat, 24 May · 09:00",
                w: "6 days",
                icon: Trophy,
                tone: "warning",
              },
              {
                t: "Charity Run",
                d: "Sun, 1 Jun · 08:00",
                w: "14 days",
                icon: ArrowRight,
                tone: "success",
              },
            ].map((t) => (
              <div
                key={t.t}
                className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${toneBg[t.tone]}`}
                >
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t.t}</div>
                  <div className="text-[11px] text-muted-foreground">{t.d}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">{t.w}</div>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Quick groups</div>
              <button type="button" className="text-xs text-brand">
                Manage
              </button>
            </div>
            {[
              ["All Staff", "24 members"],
              ["Front of House", "12 members"],
              ["Kitchen", "9 members"],
              ["Housekeeping", "4 members"],
            ].map(([t, m]) => (
              <div
                key={t}
                className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
              >
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 text-sm">{t}</div>
                <div className="text-[11px] text-muted-foreground">{m}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Compose announcement drawer */}
      <DrawerShell
        open={composeOpen}
        onOpenChange={setComposeOpen}
        title="Compose announcement"
        description="Share an update with your team."
        width="lg"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setComposeOpen(false)}>
              Save draft
            </ActionButton>
            <ActionButton onClick={() => setComposeOpen(false)}>Publish</ActionButton>
          </>
        }
      >
        <FormSection title="Message">
          <FormRow label="Title" required>
            <input
              placeholder="e.g. Summer menu launch"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </FormRow>
          <FormRow label="Body" required>
            <textarea
              className="w-full min-h-32 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="What would you like to share?"
            />
          </FormRow>
        </FormSection>
        <FormSection title="Audience">
          <FormRow label="Send to">
            <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option>All staff (48)</option>
              <option>Front of House (12)</option>
              <option>Kitchen (9)</option>
            </select>
          </FormRow>
        </FormSection>
      </DrawerShell>

      {/* Announcement detail drawer */}
      <DrawerShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.t ?? ""}
        description="Posted by Alex Thompson · Europe/London"
        meta={<StatusBadge tone="info">Announcement</StatusBadge>}
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setDetail(null)}>
              Close
            </ActionButton>
            <ActionButton onClick={() => setDetail(null)}>Mark as read</ActionButton>
          </>
        }
      >
        <FormSection title="Message">
          <p className="text-sm text-foreground">{detail?.s}</p>
        </FormSection>
        <FormSection title="Acknowledgements">
          <p className="text-xs text-muted-foreground">38 of 48 staff have acknowledged.</p>
        </FormSection>
      </DrawerShell>
    </AppShell>
  );
}
