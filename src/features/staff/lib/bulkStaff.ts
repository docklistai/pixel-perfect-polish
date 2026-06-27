import {
  buildStaffMemberInsert,
  STAFF_CONTRACT_OPTIONS,
  type AddStaffFormValues,
  type StaffMemberInsert,
} from "./addStaff";
import type { StaffContractType, WorkspaceDepartment } from "../types";

/**
 * Pure parser for the "paste staff list" bulk-add path. Turns pasted
 * spreadsheet/CSV-style text into validated `staff_members` insert payloads,
 * one per row, reusing {@link buildStaffMemberInsert} so the single-add and
 * bulk-add paths share one validation authority. No React/Supabase here — the
 * rules stay unit-testable in the node test environment.
 *
 * Expected columns (header row optional, extra columns ignored):
 *   Name, Role, Department, Contract, Weekly hours, Email
 * Name and Role are required; the rest are optional. Department is matched by
 * name against the workspace's active departments; an unknown name is a row
 * error rather than a silent "Unassigned" so the manager notices typos.
 */

/** Upper bound on a single paste, mirrored by the bulk server function. */
export const BULK_STAFF_MAX_ROWS = 200;

export interface ParsedStaffRow {
  /** 1-based source line number, for "row N" error messages. */
  line: number;
  raw: string;
  /** Display-friendly parsed cells, always present for the preview table. */
  preview: {
    name: string;
    role: string;
    department: string;
    contract: string;
    hours: string;
    email: string;
  };
  ok: boolean;
  /** Human-readable, non-leaking problems with this row. */
  errors: string[];
  /** Present only when `ok` — the payload the server will insert. */
  payload?: StaffMemberInsert;
}

export interface ParseBulkStaffResult {
  rows: ParsedStaffRow[];
  validCount: number;
  errorCount: number;
}

const CONTRACT_LABEL = new Map(STAFF_CONTRACT_OPTIONS.map((o) => [o.value, o.label]));

/** Loose contract aliases → the four schema enum values. */
function normalizeContract(raw: string): { value: StaffContractType | ""; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "" };
  const key = trimmed.toLowerCase().replace(/[\s-]+/g, "_");
  const direct = STAFF_CONTRACT_OPTIONS.find((o) => o.value === key);
  if (direct) return { value: direct.value };
  if (key === "full" || key === "ft") return { value: "full_time" };
  if (key === "part" || key === "pt") return { value: "part_time" };
  if (key === "fixed" || key === "fixed_term_contract") return { value: "fixed_term" };
  return {
    value: "",
    error: `Contract "${trimmed}" is not one of full-time, part-time, casual, or fixed-term.`,
  };
}

/** Split a single line by tab (spreadsheet paste) or comma (CSV paste). */
function splitRow(line: string): string[] {
  const delimiter = line.includes("\t") ? "\t" : ",";
  return line.split(delimiter).map((cell) => cell.trim());
}

function looksLikeHeader(cells: string[]): boolean {
  const first = (cells[0] ?? "").toLowerCase();
  const second = (cells[1] ?? "").toLowerCase();
  return first === "name" && (second === "role" || second === "");
}

/**
 * Parses pasted text into per-row results. `departments` are the workspace's
 * active departments, used to resolve a department name to its id.
 */
export function parseBulkStaff(
  text: string,
  departments: WorkspaceDepartment[],
): ParseBulkStaffResult {
  const departmentByName = new Map(departments.map((d) => [d.name.trim().toLowerCase(), d]));
  const seenEmails = new Map<string, number>();

  const lines = text.split(/\r?\n/);
  const rows: ParsedStaffRow[] = [];

  lines.forEach((rawLine, index) => {
    if (rawLine.trim() === "") return;
    const cells = splitRow(rawLine);
    if (rows.length === 0 && looksLikeHeader(cells)) return;

    const line = index + 1;
    const [name = "", role = "", departmentName = "", contractRaw = "", hours = "", email = ""] =
      cells;
    const errors: string[] = [];

    // Resolve department name → id (empty = Unassigned).
    let departmentId = "";
    const deptKey = departmentName.trim().toLowerCase();
    if (deptKey) {
      const match = departmentByName.get(deptKey);
      if (match) departmentId = match.id;
      else errors.push(`Unknown department "${departmentName.trim()}".`);
    }

    const contract = normalizeContract(contractRaw);
    if (contract.error) errors.push(contract.error);

    const formValues: AddStaffFormValues = {
      fullName: name,
      email,
      role,
      departmentId,
      contractType: contract.value,
      hoursPerWeek: hours,
    };
    const built = buildStaffMemberInsert(formValues);
    if (!built.ok) {
      for (const message of Object.values(built.errors)) {
        if (message) errors.push(message);
      }
    }

    // Catch duplicate emails inside the same paste before the DB rejects them.
    if (built.ok && built.payload.email) {
      const prior = seenEmails.get(built.payload.email);
      if (prior) errors.push(`Duplicate email — also on row ${prior}.`);
      else seenEmails.set(built.payload.email, line);
    }

    const ok = errors.length === 0 && built.ok;
    rows.push({
      line,
      raw: rawLine,
      preview: {
        name: name.trim(),
        role: role.trim(),
        department: departmentName.trim() || "Unassigned",
        contract: contract.value ? (CONTRACT_LABEL.get(contract.value) ?? contract.value) : "—",
        hours: hours.trim() || "—",
        email: email.trim() || "—",
      },
      ok,
      errors,
      payload: ok && built.ok ? built.payload : undefined,
    });
  });

  const validCount = rows.filter((r) => r.ok).length;
  return { rows, validCount, errorCount: rows.length - validCount };
}
