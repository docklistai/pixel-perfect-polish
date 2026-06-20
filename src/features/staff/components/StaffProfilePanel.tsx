import * as React from "react";
import { Link } from "@tanstack/react-router";
import { X, ArrowUpRight, Pencil } from "lucide-react";
import { Card } from "@/components/dl";
import { StaffMonogram } from "./StaffMonogram";
import { StaffPanelOverview } from "./StaffPanelOverview";
import { StaffProfileQuickActions } from "./StaffProfileQuickActions";
import { EditStaffDialog } from "./EditStaffDialog";
import type { StaffRow } from "../types";
import { mockStaffProfiles } from "../data/mockStaffProfiles";
import { buildLiveStaffProfile } from "../data/liveStaffProfile";

interface StaffProfilePanelProps {
  member: StaffRow;
  onClose: () => void;
  /** Live roster members have no demo profile; suppress fabricated identity. */
  source: "live" | "demo";
}

const NOT_SET = "Not recorded"; // honest placeholder for details the live schema does not carry

const STATUS_CLS: Record<string, string> = {
  Active: "bg-success-soft text-success",
  Inactive: "bg-muted text-muted-foreground",
  Left: "bg-muted text-muted-foreground",
  "On Leave": "bg-accent-purple-soft text-accent-purple",
  Probation: "bg-info-soft text-info",
};

const PANEL_TABS = ["Overview", "Documents", "Notes"] as const;
type PanelTab = (typeof PANEL_TABS)[number];

function docStatusLabel(status: string): { label: string; cls: string } {
  if (status === "valid") return { label: "Verified", cls: "text-success" };
  if (status === "expiring") return { label: "Expiring", cls: "text-warning" };
  return { label: "Missing", cls: "text-danger" };
}

function demoPayRate(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("manager") || r.includes("head")) return "£14.50 / hour";
  if (r.includes("supervisor") || r.includes("chef")) return "£13.50 / hour";
  return "£12.50 / hour";
}

function demoEmployeeId(id: string): string {
  return `DKL-${id.toUpperCase().replace(/-/g, "").slice(0, 6)}-2024`;
}

export function StaffProfilePanel({ member, onClose, source }: StaffProfilePanelProps) {
  // Demo rows have a rich fixture profile; live rows get a sparse, honest
  // profile (real role/department/contract/hours, empty everything else).
  const profile =
    mockStaffProfiles[member.id] ?? (source === "live" ? buildLiveStaffProfile(member) : null);
  const [activeTab, setActiveTab] = React.useState<PanelTab>("Overview");
  const [editOpen, setEditOpen] = React.useState(false);

  const statusCls = STATUS_CLS[member.status] ?? "bg-muted text-muted-foreground";
  const docs = profile?.documents ?? [];
  const notes = profile?.notes ?? [];

  // Demo pay/ID/manager/phone are fixtures keyed to the demo roster. Live
  // contact details use the real row values; unsupported fields stay neutral.
  const isLive = source === "live";
  const phone = isLive ? member.phone?.trim() || NOT_SET : (profile?.phone ?? "+44 7700 900 123");
  const employeeId = isLive ? NOT_SET : demoEmployeeId(member.id);
  const payRate = isLive ? NOT_SET : demoPayRate(member.role);
  const reportsTo = isLive ? NOT_SET : "Alex Thompson";

  return (
    <Card className="rounded-2xl overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border/60 px-4 pt-4 pb-3">
        <span className="text-sm font-semibold">{member.n}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close staff profile"
          className="rounded p-0.5 hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      </div>

      <div className="border-b border-border/60 px-4 pt-4 pb-3">
        <div className="mb-3 flex items-center gap-3">
          <StaffMonogram name={member.n} size="lg" />
          <div>
            <div className="text-base font-semibold">{member.n}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {member.role}
              {member.sub ? ` · ${member.sub}` : ""}
            </div>
            <span
              className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${statusCls}`}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1 align-middle"
                aria-hidden
              />
              {member.status}
            </span>
          </div>
        </div>

        <div className="mb-3 space-y-0.5 font-mono text-[11px] text-muted-foreground">
          <div>{member.e}</div>
          <div>{phone}</div>
        </div>

        <StaffProfileQuickActions member={member} source={source} />
      </div>

      <div
        role="tablist"
        aria-label="Staff panel sections"
        className="flex border-b border-border px-4"
      >
        {PANEL_TABS.map((t) => {
          const docsAttention =
            t === "Documents" ? docs.filter((d) => d.status !== "valid").length : 0;
          return (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={activeTab === t}
              onClick={() => setActiveTab(t)}
              className={`pb-2 pt-2.5 mr-4 text-xs font-medium border-b-2 transition-colors inline-flex items-center gap-1.5 ${activeTab === t ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t}
              {docsAttention > 0 && (
                <span className="rounded-full bg-info-soft text-info text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                  {docsAttention}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-4 px-4 py-3">
        {activeTab === "Overview" && (
          <StaffPanelOverview
            member={member}
            profile={profile}
            employeeId={employeeId}
            payRate={payRate}
            reportsTo={reportsTo}
          />
        )}

        {activeTab === "Documents" && (
          <div className="space-y-0">
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents on record.</p>
            ) : (
              docs.map((d) => {
                const { label, cls } = docStatusLabel(d.status);
                return (
                  <div
                    key={d.name}
                    className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0 gap-2"
                  >
                    <span className="text-xs truncate">{d.name}</span>
                    <span className={`text-[11px] font-semibold shrink-0 ${cls}`}>{label}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "Notes" && (
          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No manager notes recorded.</p>
            ) : (
              notes.slice(0, 4).map((n, i) => (
                <div key={i} className="pb-2 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{n.author}</span>
                    <span className="text-[11px] text-muted-foreground ml-auto">{n.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {n.text}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 px-4 pb-4">
        {isLive && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit details
          </button>
        )}
        <Link
          to="/staff/$staffId"
          params={{ staffId: member.id }}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
            isLive
              ? "border border-border hover:bg-muted/50"
              : "bg-brand text-white transition-opacity hover:opacity-90"
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          Open full profile
        </Link>
      </div>

      {isLive && <EditStaffDialog open={editOpen} onOpenChange={setEditOpen} member={member} />}
    </Card>
  );
}
