import type { StaffProfile, StaffRow } from "../types";
import { buildProfile } from "./profiles/buildProfile";

/**
 * Builds a sparse, honest {@link StaffProfile} from a live workspace
 * {@link StaffRow}. Only fields the live roster actually carries are populated
 * (name, email, role, department, status, contract, contracted hours, portal
 * access). Everything the live schema does not provide — pay, employee id,
 * documents, skills, schedule, time, leave, work-pattern analytics — is left to
 * {@link buildProfile}'s neutral empty defaults. No HR data is fabricated for a
 * live member; consumers render honest empty states for the absent fields.
 */
export function buildLiveStaffProfile(row: StaffRow): StaffProfile {
  return buildProfile({
    id: row.id,
    name: row.name || row.n,
    email: row.e,
    role: row.role,
    // Live rows set `sub` to the department; drop the duplicate so headers do
    // not render "Role · Dept · Dept".
    sub: row.sub && row.sub !== row.dept ? row.sub : "",
    dept: row.dept,
    status: row.status,
    // Pass real roster values through as-is. A missing contract/hours stays "—"
    // rather than being defaulted to a fabricated "Full-time".
    contract: row.contract,
    contractedHours: row.hours,
    img: row.img,
    portalAccess: { status: row.portalStatus ?? "Not invited" },
  });
}
