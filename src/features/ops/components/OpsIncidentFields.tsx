import { FormRow } from "@/components/dl";
import type { OpsEntryDraft } from "../api/opsEntryMutations";
import type { OpsDraftSetter } from "./OpsLogEntryFields";

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function OpsIncidentFields(props: {
  draft: OpsEntryDraft;
  set: OpsDraftSetter;
  editing: boolean;
}) {
  return (
    <>
      <FormRow label="Severity" htmlFor="ops-log-severity">
        <select
          id="ops-log-severity"
          className="select w-full"
          value={props.draft.severity ?? ""}
          onChange={(event) =>
            props.set("severity", event.target.value as OpsEntryDraft["severity"])
          }
        >
          <option value="">Select severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </FormRow>
      <FormRow label="Occurred time" htmlFor="ops-log-occurred">
        <input
          id="ops-log-occurred"
          type="datetime-local"
          className="input w-full"
          disabled={props.editing}
          value={toLocalInput(props.draft.occurredAt)}
          onChange={(event) =>
            props.set(
              "occurredAt",
              event.target.value ? new Date(event.target.value).toISOString() : null,
            )
          }
        />
      </FormRow>
      <div className="sm:col-span-2">
        <FormRow label="Immediate action" htmlFor="ops-log-action">
          <textarea
            id="ops-log-action"
            className="textarea w-full"
            rows={2}
            maxLength={2000}
            value={props.draft.immediateAction ?? ""}
            onChange={(event) => props.set("immediateAction", event.target.value || null)}
          />
        </FormRow>
      </div>
    </>
  );
}
