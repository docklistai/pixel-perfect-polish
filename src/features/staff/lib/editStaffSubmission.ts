import { describeStaffWriteError } from "./addStaff";

/**
 * Outcome of one Edit Staff submission.
 *
 * Staff details and the hourly rate are two independent writes to two
 * different tables. They used to share a single error slot, so a pay-rate
 * failure after a successful details save reported the whole dialog as failed —
 * the manager was told nothing had saved when their edits already had, and a
 * retry re-sent the details write. Each half now carries its own status, and
 * a saved details write is never re-attempted or re-described as a failure.
 */
export type StaffWriteStatus = "saved" | "failed" | "skipped";

export interface EditStaffSubmissionOutcome {
  details: StaffWriteStatus;
  pay: StaffWriteStatus;
  detailsError: string | null;
  payError: string | null;
}

export type StaffWriteResult = { ok: true } | { ok: false; message: string };

/** Any thrown/rejected write becomes the shared generic message, never a crash. */
async function runWrite(write: () => Promise<StaffWriteResult>): Promise<StaffWriteResult> {
  try {
    return await write();
  } catch {
    return { ok: false, message: describeStaffWriteError(null) };
  }
}

export async function submitEditStaff({
  detailsAlreadySaved,
  saveDetails,
  savePayRate,
}: {
  /** True when a previous submission already persisted the details half. */
  detailsAlreadySaved: boolean;
  saveDetails: () => Promise<StaffWriteResult>;
  savePayRate: () => Promise<StaffWriteResult>;
}): Promise<EditStaffSubmissionOutcome> {
  if (!detailsAlreadySaved) {
    const details = await runWrite(saveDetails);
    if (!details.ok) {
      // The pay rate is deliberately not attempted: the manager is being asked
      // to correct the details first, and a second write would muddy the retry.
      return { details: "failed", pay: "skipped", detailsError: details.message, payError: null };
    }
  }

  const pay = await runWrite(savePayRate);
  const details: StaffWriteStatus = detailsAlreadySaved ? "skipped" : "saved";
  if (!pay.ok) return { details, pay: "failed", detailsError: null, payError: pay.message };
  return { details, pay: "saved", detailsError: null, payError: null };
}
