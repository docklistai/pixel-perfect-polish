import * as React from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";

const DEPARTMENTS = ["All", "Front of House", "Kitchen", "Bar", "Housekeeping", "Maintenance"];
const STATUSES = ["All", "Active", "Probation", "On Leave"];

interface FilterDropdownProps {
  value: string;
  options: string[];
  allLabel: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}

function FilterDropdown({ value, options, allLabel, onChange, ariaLabel }: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = value === "All" ? allLabel : value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-sm"
      >
        {label}
        <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[172px] rounded-xl border border-border bg-card shadow-lg py-1 overflow-hidden"
        >
          {options.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex items-center w-full gap-2 px-3.5 py-2 text-xs text-left transition-colors hover:bg-muted/60 ${
                  active ? "font-semibold text-brand" : "font-medium text-foreground"
                }`}
              >
                {active ? (
                  <Check className="h-3 w-3 text-brand shrink-0" aria-hidden />
                ) : (
                  <span className="h-3 w-3 shrink-0" />
                )}
                {opt === "All" ? allLabel : opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface StaffFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  deptFilter: string;
  onDeptChange: (d: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  filteredCount: number;
  totalCount: number;
}

export function StaffFilterBar({
  query,
  onQueryChange,
  deptFilter,
  onDeptChange,
  statusFilter,
  onStatusChange,
  filteredCount,
  totalCount,
}: StaffFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border/60 mb-0">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 flex-1 max-w-xs min-w-[180px] shadow-sm">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search staff by name, email or role"
          className="bg-transparent text-xs outline-none w-full"
          placeholder="Search by name, email or role…"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>

      <FilterDropdown
        value={deptFilter}
        options={DEPARTMENTS}
        allLabel="All departments"
        onChange={onDeptChange}
        ariaLabel="Filter by department"
      />

      <FilterDropdown
        value={statusFilter}
        options={STATUSES}
        allLabel="Any status"
        onChange={onStatusChange}
        ariaLabel="Filter by employment status"
      />

      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
        {filteredCount} of {totalCount}
      </span>
    </div>
  );
}
