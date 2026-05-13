import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  IconButton,
  FilterButton,
  ConfirmDialog,
  StatusBadge,
} from "@/components/dl";
import { ChevronLeft, ChevronRight, Calendar, MoreHorizontal } from "lucide-react";

import { getWeekLabel, getWeekDayLabels } from "@/features/rota/lib/weekHelpers";
import { staff, baseDayStats } from "@/features/rota/data/mockData";
import type { RotaFilters, RotaViewMode, ShiftDetail, StaffMember } from "@/features/rota/types";

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
import { ShiftDetailDrawer } from "@/features/rota/components/ShiftDetailDrawer";
import { WeekPickerDialog } from "@/features/rota/components/WeekPickerDialog";
import { RotaFiltersDrawer } from "@/features/rota/components/RotaFiltersDrawer";
import { ViewModeDialog } from "@/features/rota/components/ViewModeDialog";
import { MoreActionsDialog } from "@/features/rota/components/MoreActionsDialog";
import { TemplatesDialog } from "@/features/rota/components/TemplatesDialog";
import { CopyLastWeekDialog } from "@/features/rota/components/CopyLastWeekDialog";
import { CoverageDetailsDrawer } from "@/features/rota/components/CoverageDetailsDrawer";
import { WorkingTimeDetailsDrawer } from "@/features/rota/components/WorkingTimeDetailsDrawer";
import { AddStaffDialog } from "@/features/rota/components/AddStaffDialog";

export const Route = createFileRoute("/rota")({
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const SCHEDULE_TITLE_ID = "rota-schedule-title";
const SCHEDULE_DESC_ID = "rota-schedule-desc";
const VIEW_MODE_LABELS: Record<RotaViewMode, string> = {
  employee: "Employee",
  role: "Role",
  day: "Day",
};
const DEFAULT_ROTA_FILTERS: RotaFilters = {
  department: "all",
  shiftStatus: "all",
  warningType: "all",
};

function hasScheduledShift(row: StaffMember) {
  return row.shifts.some((shift) => !shift.flag);
}

function hasWorkingTimeAlert(row: StaffMember) {
  const scheduledDays = row.shifts.filter(
    (shift) => shift.flag !== "off" && shift.flag !== "open",
  ).length;

  return row.hrs === "40h" && scheduledDays > 5;
}

function rowMatchesFilters(row: StaffMember, filters: RotaFilters, staffSearch: string) {
  const normalizedSearch = staffSearch.trim().toLowerCase();
  const matchesSearch =
    !normalizedSearch ||
    row.name.toLowerCase().includes(normalizedSearch) ||
    row.role.toLowerCase().includes(normalizedSearch);
  const matchesDepartment = filters.department === "all" || row.role === filters.department;
  const matchesShiftStatus =
    filters.shiftStatus === "all" ||
    (filters.shiftStatus === "scheduled" && hasScheduledShift(row)) ||
    row.shifts.some((shift) => shift.flag === filters.shiftStatus);
  const matchesWarning =
    filters.warningType === "all" ||
    (filters.warningType === "conflicts" &&
      row.shifts.some((shift) => shift.flag === "conflict")) ||
    (filters.warningType === "working-time" && hasWorkingTimeAlert(row));

  return matchesSearch && matchesDepartment && matchesShiftStatus && matchesWarning;
}

function RotaPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [addStaffOpen, setAddStaffOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [viewModeOpen, setViewModeOpen] = React.useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [copyLastWeekOpen, setCopyLastWeekOpen] = React.useState(false);
  const [coverageDetailsOpen, setCoverageDetailsOpen] = React.useState(false);
  const [workingTimeOpen, setWorkingTimeOpen] = React.useState(false);
  const [published, setPublished] = React.useState(false);
  const [shiftDetail, setShiftDetail] = React.useState<ShiftDetail | null>(null);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [filters, setFilters] = React.useState<RotaFilters>(DEFAULT_ROTA_FILTERS);
  const [staffSearch, setStaffSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<RotaViewMode>("employee");

  const weekLabel = getWeekLabel(weekOffset);
  const days = getWeekDayLabels(weekOffset).map((d, i) => ({ d, ...baseDayStats[i] }));
  const roleOptions = Array.from(new Set(staff.map((row) => row.role)));
  const visibleStaff = staff.filter((row) => rowMatchesFilters(row, filters, staffSearch));

  const openShiftCount = staff.reduce(
    (count, row) => count + row.shifts.filter((sh) => sh.flag === "open").length,
    0,
  );
  const assignedShiftCount = staff.reduce(
    (count, row) =>
      count + row.shifts.filter((sh) => sh.flag !== "off" && sh.flag !== "open").length,
    0,
  );
  const plannedShiftCount = staff.reduce(
    (count, row) => count + row.shifts.filter((sh) => sh.flag !== "off").length,
    0,
  );
  const conflictSummaries = staff.flatMap((row) =>
    row.shifts.flatMap((sh, i) =>
      sh.flag === "conflict"
        ? [{ staff: row.name, day: days[i].d, detail: `${sh.role} · ${sh.time}` }]
        : [],
    ),
  );
  const conflictCount = conflictSummaries.length;
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
          <FilterButton icon={Calendar} label={weekLabel} onClick={() => setWeekPickerOpen(true)} />
          <IconButton
            icon={ChevronRight}
            label="Next week"
            onClick={() => setWeekOffset((w) => w + 1)}
          />
          <FilterButton
            label={`View by: ${VIEW_MODE_LABELS[viewMode]}`}
            onClick={() => setViewModeOpen(true)}
          />
          <IconButton
            icon={MoreHorizontal}
            label="More actions"
            onClick={() => setMoreActionsOpen(true)}
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
            onFilter={() => setFiltersOpen(true)}
            onGenerateRota={() => setGenerateOpen(true)}
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
          />
          <RotaGrid
            days={days}
            staff={visibleStaff}
            weekLabel={weekLabel}
            staffSearch={staffSearch}
            scheduleTitleId={SCHEDULE_TITLE_ID}
            scheduleDescId={SCHEDULE_DESC_ID}
            onStaffSearchChange={setStaffSearch}
            onShiftOpen={setShiftDetail}
            onAddStaff={() => setAddStaffOpen(true)}
          />
          <RotaGridLegendBar staffCount={visibleStaff.length} />
        </Card>

        <div className="space-y-3.5">
          <LabourSummaryCard onViewCoverageDetails={() => setCoverageDetailsOpen(true)} />
          <AlertsCard
            openShiftCount={openShiftCount}
            conflictCount={conflictCount}
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
            onWorkingTimeAlert={() => setWorkingTimeOpen(true)}
          />
          <PublishReadinessCard
            published={published}
            conflictCount={conflictCount}
            assignedShiftCount={assignedShiftCount}
            plannedShiftCount={plannedShiftCount}
            onPublish={() => setPublishOpen(true)}
          />
          <RoleCoverageCard roleCoverage={roleCoverage} />
          <LegendCard />
        </div>
      </div>

      <AddShiftDrawer open={addOpen} onOpenChange={setAddOpen} days={days} staff={staff} />
      <AddStaffDialog open={addStaffOpen} onOpenChange={setAddStaffOpen} />
      <ConflictDrawer
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        conflicts={conflictSummaries}
      />
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`${published ? "Republish" : "Publish"} rota for w/c ${weekLabel}?`}
        description={`${staff.length} staff will see this published snapshot in the staff portal.`}
        confirmLabel={published ? "Republish" : "Publish"}
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
      <WeekPickerDialog
        open={weekPickerOpen}
        onOpenChange={setWeekPickerOpen}
        weekLabel={weekLabel}
        onSelectOffset={setWeekOffset}
      />
      <RotaFiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        roleOptions={roleOptions}
        onFiltersChange={setFilters}
      />
      <ViewModeDialog
        open={viewModeOpen}
        onOpenChange={setViewModeOpen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <MoreActionsDialog
        open={moreActionsOpen}
        onOpenChange={setMoreActionsOpen}
        onCopyLastWeek={() => setCopyLastWeekOpen(true)}
        onTemplates={() => setTemplatesOpen(true)}
      />
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <CopyLastWeekDialog
        open={copyLastWeekOpen}
        onOpenChange={setCopyLastWeekOpen}
        weekLabel={weekLabel}
      />
      <CoverageDetailsDrawer
        open={coverageDetailsOpen}
        onOpenChange={setCoverageDetailsOpen}
        staffCount={staff.length}
        openShiftCount={openShiftCount}
        conflictCount={conflictCount}
        roleCoverage={roleCoverage}
      />
      <WorkingTimeDetailsDrawer open={workingTimeOpen} onOpenChange={setWorkingTimeOpen} />
      <ShiftDetailDrawer shiftDetail={shiftDetail} onClose={() => setShiftDetail(null)} />
    </AppShell>
  );
}
