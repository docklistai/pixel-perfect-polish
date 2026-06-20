import type { StaffRow } from "../types";

export const STAFF_STATUS_FILTERS = ["All", "Active", "Inactive", "Left"] as const;

export type StaffStatusFilter = (typeof STAFF_STATUS_FILTERS)[number];

export interface StaffListFilters {
  query: string;
  department: string;
  status: string;
}

export interface StaffStat {
  key: "total" | "active" | "inactive" | "left";
  label: string;
  value: string;
  sub: string;
  tone: "info" | "brand" | "muted";
}

export function buildStaffStats(staffRows: StaffRow[]): StaffStat[] {
  const countStatus = (status: string) => staffRows.filter((row) => row.status === status).length;

  return [
    {
      key: "total",
      label: "Total staff",
      value: String(staffRows.length),
      sub: "Across your team",
      tone: "info",
    },
    {
      key: "active",
      label: "Active",
      value: String(countStatus("Active")),
      sub: "Currently active",
      tone: "brand",
    },
    {
      key: "inactive",
      label: "Inactive",
      value: String(countStatus("Inactive")),
      sub: "Not currently active",
      tone: "muted",
    },
    {
      key: "left",
      label: "Left",
      value: String(countStatus("Left")),
      sub: "Left the team",
      tone: "muted",
    },
  ];
}

export function filterStaffRows(rows: StaffRow[], filters: StaffListFilters): StaffRow[] {
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.department !== "All" && row.dept !== filters.department) return false;
    if (filters.status !== "All" && row.status !== filters.status) return false;
    if (!query) return true;

    return (
      row.n.toLowerCase().includes(query) ||
      row.e.toLowerCase().includes(query) ||
      row.role.toLowerCase().includes(query) ||
      row.dept.toLowerCase().includes(query)
    );
  });
}
