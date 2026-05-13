import * as React from "react";
import { X, MessageCircle, Phone, Mail, Calendar, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/dl";
import type { StaffRow } from "../types";

interface StaffProfilePanelProps {
  member: StaffRow;
  onClose: () => void;
}

const ACTION_ICONS = [MessageCircle, Phone, Mail, Calendar, MoreHorizontal] as const;
const TABS = ["Overview", "Documents", "Availability", "Notes"] as const;
const OVERVIEW_FIELDS: [string, string][] = [
  ["Employee ID", "DCL-1027"],
  ["Start date", "14 Mar 2023 (2y 2m)"],
  ["Department", "Front of House"],
  ["Reports to", "Alex Thompson"],
  ["Contract", "Full-time (40h/week)"],
  ["Pay rate", "£13.50 per hour"],
  ["Location", "Harbour View Hotel"],
  ["Address", "12 Harbour Rd, Brighton, BN1 1AA"],
];
const SKILLS = ["Customer Service", "Supervisor", "Food Safety Level 2", "Beverage Knowledge"];

export function StaffProfilePanel({ member, onClose }: StaffProfilePanelProps) {
  return (
    <Card className="col-span-12 lg:col-span-3 rounded-2xl p-5 self-start">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{member.n}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close staff profile"
          className="rounded p-0.5 hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <img
          src={`https://i.pravatar.cc/96?img=${member.img}`}
          className="h-16 w-16 rounded-full object-cover"
          alt=""
        />
        <div>
          <div className="font-semibold">{member.n}</div>
          <div className="text-xs text-muted-foreground">
            {member.role}
            {member.sub ? ` · ${member.sub}` : ""}
          </div>
          <span className="mt-1 inline-block rounded-md bg-success-soft text-success px-2 py-0.5 text-[11px] font-medium">
            {member.status}
          </span>
        </div>
      </div>

      <div className="mt-3 text-xs space-y-1">
        <div className="text-foreground">{member.e}</div>
        <div className="text-muted-foreground">Department: {member.dept}</div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {ACTION_ICONS.map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="mt-5 border-b border-border flex gap-4 text-xs">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            className={`pb-2 ${i === 0 ? "border-b-2 border-brand text-brand font-semibold" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <dl className="mt-4 text-xs space-y-2">
        {OVERVIEW_FIELDS.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</dt>
            <dd className="font-medium text-right">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <div className="text-xs font-semibold mb-2">Skills & Certifications</div>
        <div className="flex flex-wrap gap-1.5">
          {SKILLS.map((t) => (
            <span key={t} className="rounded-md border border-border px-2 py-0.5 text-[11px]">
              {t}
            </span>
          ))}
          <span className="text-[11px] text-brand font-medium">+ 3 more</span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border p-3">
        <div className="text-xs font-semibold mb-2">NEXT SCHEDULED SHIFT</div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-brand" /> Today, 12 May{" "}
          <span className="ml-auto font-semibold">14:00 – 22:00</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Front of House</span>
          <span>Evening Shift</span>
        </div>
        <button type="button" className="mt-2 block text-xs font-semibold text-brand">
          View full rota
        </button>
      </div>
    </Card>
  );
}
