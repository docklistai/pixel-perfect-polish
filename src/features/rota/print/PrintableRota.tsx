import * as React from "react";
import { createPortal } from "react-dom";
import "./printableRota.css";
import type { PrintableRota as PrintableRotaModel, PrintableShift } from "./printableRotaModel";

/**
 * The printed rota document. Renders nothing on screen; the stylesheet reveals
 * it (and hides everything else on <body>) only inside @media print.
 *
 * It is deliberately a dumb renderer of `PrintableRotaModel` — every decision
 * about what may appear on paper lives in the model, which has no field for
 * labour, cost, readiness or manager identity.
 */

function ShiftEntry({ shift }: { shift: PrintableShift }) {
  const meta = [shift.role, shift.department].filter(Boolean).join(" · ");
  return (
    <div className={`rota-print-shift${shift.open ? " rota-print-shift--open" : ""}`}>
      <div className="rota-print-shift-time">
        {shift.start}–{shift.end}
      </div>
      <div className="rota-print-shift-meta">
        {shift.open && <span className="rota-print-open-tag">Open · </span>}
        {meta}
        {shift.breakMinutes !== null && ` · ${shift.breakMinutes}m break`}
      </div>
    </div>
  );
}

function DayCell({ shifts }: { shifts: PrintableShift[] }) {
  if (shifts.length === 0) return <td className="rota-print-empty-cell">—</td>;
  return (
    <td>
      {shifts.map((shift, index) => (
        <ShiftEntry key={`${shift.start}-${shift.end}-${index}`} shift={shift} />
      ))}
    </td>
  );
}

export function PrintableRota({ model }: { model: PrintableRotaModel }) {
  // Portal to <body> so the print rule can hide every other body child, and
  // guard for SSR where there is no document to portal into.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const statusModifier =
    model.status.label === "Draft"
      ? "draft"
      : model.status.label === "Unpublished changes"
        ? "changes"
        : "published";

  const document_ = (
    <div className="rota-print-root" role="document">
      <header className="rota-print-header">
        <div>
          <h1 className="rota-print-title">Staff rota — {model.weekLabel}</h1>
          <p className="rota-print-subtitle">{model.identityLine}</p>
          <p className="rota-print-status-detail">{model.status.detail}</p>
        </div>
        <div className="rota-print-meta">
          <div className={`rota-print-status rota-print-status--${statusModifier}`}>
            {model.status.label}
          </div>
          <div style={{ marginTop: "1.5mm" }}>Printed {model.printedAt}</div>
        </div>
      </header>

      {model.emptyMessage ? (
        <p className="rota-print-empty">{model.emptyMessage}</p>
      ) : (
        <table className="rota-print-table">
          <caption className="sr-only">
            Rota for {model.weekLabel} at {model.locationName}. {model.status.detail}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="rota-print-col-name">
                Staff
              </th>
              {model.dayLabels.map((label) => (
                <th key={label} scope="col" className="rota-print-col-day">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.staffRows.map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  <div className="rota-print-staff-name">{row.name}</div>
                  <div className="rota-print-staff-role">{row.role}</div>
                </th>
                {row.days.map((shifts, dayIndex) => (
                  <DayCell key={model.dayLabels[dayIndex]} shifts={shifts} />
                ))}
              </tr>
            ))}
            {model.openShiftDays.some((day) => day.length > 0) && (
              <tr>
                <th scope="row">
                  <div className="rota-print-staff-name">Open shifts</div>
                  <div className="rota-print-staff-role">Not yet assigned</div>
                </th>
                {model.openShiftDays.map((shifts, dayIndex) => (
                  <DayCell key={model.dayLabels[dayIndex]} shifts={shifts} />
                ))}
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div className="rota-print-legend">
        <span>
          <strong>Open</strong> = dashed box, shift not yet assigned
        </span>
        <span>Times shown as start–end (24-hour)</span>
        <span>— = no shift scheduled</span>
        <span>
          <strong>{model.status.label}</strong> — {model.status.detail}
        </span>
      </div>

      <div className="rota-print-note">
        <span className="rota-print-note-label">Manager notes:</span>
      </div>
    </div>
  );

  return createPortal(document_, window.document.body);
}
