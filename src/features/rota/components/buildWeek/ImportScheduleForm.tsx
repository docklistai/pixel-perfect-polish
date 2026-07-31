import type { Dispatch } from "react";
import { FormSection } from "@/components/dl";
import {
  DATE_ORDERS,
  type ImportDrawerEvent,
  type ImportDrawerState,
} from "./importScheduleDrawerState";

/**
 * What to import, and how to read its dates.
 *
 * The two questions a manager answers before anything is sent anywhere. They sit
 * together because the second one changes the meaning of the first: the same
 * paste is a different week depending on the declared date order.
 *
 * Every event goes straight to the drawer's reducer, so this file holds no state
 * of its own and cannot disagree with what will be previewed.
 */
export function ImportScheduleForm({
  state,
  dispatch,
}: {
  state: ImportDrawerState;
  dispatch: Dispatch<ImportDrawerEvent>;
}) {
  return (
    <>
      <FormSection
        title="1. Paste the schedule"
        description="The first row must be headers. Date, Role, Start and End are required; Staff, Department, Break and Overnight are optional."
      >
        <textarea
          value={state.text}
          onChange={(event) => dispatch({ type: "text-changed", text: event.target.value })}
          rows={7}
          spellCheck={false}
          aria-label="Schedule to import"
          placeholder={"Date,Staff,Role,Start,End\n2026-08-03,Ana Chef,Chef,09:00,17:00"}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs"
        />
      </FormSection>

      <FormSection
        title="2. Say how dates are written"
        description="03/08/2026 means different days in different places, so this is never guessed."
      >
        <div className="flex flex-wrap gap-2">
          {DATE_ORDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => dispatch({ type: "date-order-changed", dateOrder: option.value })}
              aria-pressed={state.dateOrder === option.value}
              className={`rounded-xl border px-3 py-2 text-xs transition ${
                state.dateOrder === option.value
                  ? "border-brand bg-brand-soft/25 font-semibold"
                  : "border-border hover:border-brand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </FormSection>
    </>
  );
}
