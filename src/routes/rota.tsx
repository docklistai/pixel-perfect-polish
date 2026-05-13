import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  ActionButton,
  IconButton,
  FilterButton,
  ConfirmDialog,
  StatusBadge,
} from "@/components/dl";
import { ChevronLeft, ChevronRight, Calendar, CalendarPlus, MoreHorizontal } from "lucide-react";

import { getWeekLabel, getWeekDayLabels } from "@/features/rota/lib/weekHelpers";
import { staff, baseDayStats } from "@/features/rota/data/mockData";
import type { ShiftDetail } from "@/features/rota/types";

import { RotaStatusBanner } from "@/features/rota/components/RotaStatusBanner";
import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { LabourSummaryCard } from "@/features/rota/components/LabourSummaryCard";
import { AlertsCard } from "@/features/rota/components/AlertsCard";
import { PublishReadinessCard } from "@/features/rota/components/PublishReadinessCard";
import { RoleCoverageCard } from "@/features/rota/components/RoleCoverageCard";
import { LegendCard } from "@/features/rota/components/LegendCard";
import { AddShiftDrawer } from "@/features/rota/components/AddShiftDrawer";
import { ConflictDrawer } from "@/features/rota/components/ConflictDrawer";
import { GenerateRotaDialog } from "@/features/rota/components/GenerateRotaDialog";
import { UnavailableFeatureDialog } from "@/features/rota/components/UnavailableFeatureDialog";
import { ShiftDetailDrawer } from "@/features/rota/components/ShiftDetailDrawer";

export const Route = createFileRoute("/rota")({
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const SCHEDULE_TITLE_ID = "rota-schedule-title";
const SCHEDULE_DESC_ID = "rota-schedule-desc";

function RotaPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [published, setPublished] = React.useState(false);
  const [shiftDetail, setShiftDetail] = React.useState<ShiftDetail | null>(null);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [unavailableFeature, setUnavailableFeature] = React.useState<string | null>(null);

  const weekLabel = getWeekLabel(weekOffset);
  const days = getWeekDayLabels(weekOffset).map((d, i) => ({ d, ...baseDayStats[i] }));

  const openShiftCount = staff.reduce(
    (count, row) => count + row.shifts.filter((sh) => sh.flag === "open").length,
    0,
  );
  const conflictCount = staff.reduce(
    (count, row) => count + row.shifts.filter((sh) => sh.flag === "conflict").length,
    0,
  );
  const roleCoverage = staff
    .map((row) => {
      const filled = row.shifts.filter((sh) => sh.flag !== "off" && sh.flag !== "open").length;
      const total = row.shifts.length;
      const pct = Math.round((filled / total) * 100);
      return { label: row.role, value: `${filled} / ${total}`, pct, tone: row.tone };
    })
    .sort((a, b) => a.pct - b.pct);

  return (
    <AppShell>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[2rem] font-semibold tracking-tight md:text-[2.125rem]">Rota</h1>
            <StatusBadge tone={published ? "success" : "warning"} dot>
              {published ? "Published" : "Draft"} ·{" "}
              {published ? "staff can see this snapshot" : "edited 12 min ago"}
            </StatusBadge>
          </div>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Week of {weekLabel} · Harbour View Hotel
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <IconButton
            icon={ChevronLeft}
            label="Previous week"
            onClick={() => setWeekOffset((w) => w - 1)}
          />
          <FilterButton
            icon={Calendar}
            label={weekLabel}
            onClick={() => setUnavailableFeature("Week picker")}
          />
          <IconButton
            icon={ChevronRight}
            label="Next week"
            onClick={() => setWeekOffset((w) => w + 1)}
          />
          <FilterButton
            label="All departments"
            onClick={() => setUnavailableFeature("Department filter")}
          />
          <FilterButton
            label="View by: Employee"
            onClick={() => setUnavailableFeature("View mode")}
          />
          <ActionButton icon={CalendarPlus} onClick={() => setGenerateOpen(true)}>
            Generate rota
          </ActionButton>
          <IconButton
            icon={MoreHorizontal}
            label="More actions"
            onClick={() => setUnavailableFeature("More actions")}
          />
        </div>
      </div>

      <RotaStatusBanner
        published={published}
        openShiftCount={openShiftCount}
        conflictCount={conflictCount}
        onPublish={() => setPublishOpen(true)}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-hidden p-0">
          <RotaGridToolbar
            conflictCount={conflictCount}
            openShiftCount={openShiftCount}
            onFilter={() => setUnavailableFeature("Filters")}
            onTemplates={() => setUnavailableFeature("Templates")}
            onCopyLastWeek={() => setUnavailableFeature("Copy last week")}
            onGenerateRota={() => setGenerateOpen(true)}
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
          />
          <RotaGrid
            days={days}
            staff={staff}
            weekLabel={weekLabel}
            scheduleTitleId={SCHEDULE_TITLE_ID}
            scheduleDescId={SCHEDULE_DESC_ID}
            onShiftOpen={setShiftDetail}
            onAddStaff={() => setUnavailableFeature("Add staff")}
          />
          <RotaGridLegendBar staffCount={staff.length} />
        </Card>

        <div className="space-y-3.5">
          <LabourSummaryCard onViewAnalysis={() => setUnavailableFeature("Labour analysis")} />
          <AlertsCard
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
            onWorkingTimeAlert={() => setUnavailableFeature("Working time details")}
          />
          <PublishReadinessCard
            published={published}
            conflictCount={conflictCount}
            onPublish={() => setPublishOpen(true)}
          />
          <RoleCoverageCard roleCoverage={roleCoverage} />
          <LegendCard />
        </div>
      </div>

      <AddShiftDrawer open={addOpen} onOpenChange={setAddOpen} days={days} staff={staff} />
      <ConflictDrawer open={conflictOpen} onOpenChange={setConflictOpen} />
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish rota for w/c ${weekLabel}?`}
        description="24 staff will be notified via the staff portal."
        confirmLabel="Publish"
        cancelLabel="Not yet"
        onConfirm={() => {
          setPublished(true);
          setPublishOpen(false);
        }}
      />
      <GenerateRotaDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        weekLabel={weekLabel}
      />
      <UnavailableFeatureDialog
        feature={unavailableFeature}
        onClose={() => setUnavailableFeature(null)}
      />
      <ShiftDetailDrawer shiftDetail={shiftDetail} onClose={() => setShiftDetail(null)} />
    </AppShell>
  );
}
