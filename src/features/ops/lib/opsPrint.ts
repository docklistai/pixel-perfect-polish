import type { OpsBriefing } from "../types";

export const OPS_BRIEFING_PRINT_NONE =
  "No briefing has been published for this location today, so there is nothing to print.";
export const OPS_BRIEFING_PRINT_AMBIGUOUS =
  "Several locations published a briefing today. Select a location to print its briefing.";

export interface OpsBriefingPrintDocument {
  title: string;
  context: string;
  summary: string;
}

export type OpsBriefingPrintTarget =
  | { status: "ready"; briefing: OpsBriefing }
  | { status: "none" }
  | { status: "ambiguous" };

/**
 * Picks the operational briefing for the current location and local calendar day.
 * `isToday` is resolved server-side against the location timezone, so this never
 * re-derives a calendar day on the client.
 */
export function selectPrintableBriefing(
  briefings: OpsBriefing[],
  locationId: string | null,
): OpsBriefingPrintTarget {
  const today = briefings.filter(
    (briefing) => briefing.isToday && (locationId === null || briefing.locationId === locationId),
  );
  if (today.length === 0) return { status: "none" };
  if (locationId === null && new Set(today.map((briefing) => briefing.locationId)).size > 1)
    return { status: "ambiguous" };
  const [newest] = [...today].sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id),
  );
  return newest ? { status: "ready", briefing: newest } : { status: "none" };
}

/** The complete print contract: only the briefing itself, never surrounding page chrome. */
export function buildOpsBriefingPrintDocument(briefing: OpsBriefing): OpsBriefingPrintDocument {
  return {
    title: briefing.title,
    context: `${briefing.locationName} · ${briefing.briefingDate} · ${briefing.authorName}`,
    summary: briefing.summary,
  };
}

export function printOpsBriefing(briefing: OpsBriefing): boolean {
  const document_ = buildOpsBriefingPrintDocument(briefing);
  const frame = document.createElement("iframe");
  frame.title = `Print ${document_.title}`;
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.append(frame);
  const page = frame.contentDocument;
  if (!page) {
    frame.remove();
    return false;
  }
  const style = page.createElement("style");
  style.textContent =
    "body{font:15px/1.5 system-ui;margin:40px;color:#111}h1{font-size:24px}small{color:#555}pre{white-space:pre-wrap;font:inherit}";
  page.head.append(style);
  const title = page.createElement("h1");
  title.textContent = document_.title;
  const context = page.createElement("small");
  context.textContent = document_.context;
  const summary = page.createElement("pre");
  summary.textContent = document_.summary;
  page.body.append(title, context, summary);
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(() => frame.remove(), 1_000);
  return true;
}
