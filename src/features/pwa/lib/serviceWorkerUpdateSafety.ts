export interface ServiceWorkerUpdateActivity {
  activeMutations: number;
  hasDirtyForm: boolean;
  hasOpenDialog: boolean;
  hasFocusedEditor: boolean;
  hasExplicitBlocker: boolean;
}

export function updateBoundaryBlockReason(activity: ServiceWorkerUpdateActivity): string | null {
  if (activity.activeMutations > 0) return "Wait for the current change to finish.";
  if (activity.hasDirtyForm) return "Save or discard the active form before updating.";
  if (activity.hasOpenDialog) return "Close the active dialog before updating.";
  if (activity.hasFocusedEditor) return "Finish editing the current field before updating.";
  if (activity.hasExplicitBlocker) return "Finish the active work before updating.";
  return null;
}

function isEditable(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.matches("input, textarea, select") ||
    element.isContentEditable ||
    element.closest("[contenteditable='true']") !== null
  );
}

export function readDocumentUpdateActivity(
  documentRef: Document,
  activeMutations: number,
): ServiceWorkerUpdateActivity {
  return {
    activeMutations,
    hasDirtyForm: documentRef.querySelector("form[data-dirty='true']") !== null,
    hasOpenDialog: documentRef.querySelector("[role='dialog'][data-state='open']") !== null,
    hasFocusedEditor: isEditable(documentRef.activeElement),
    hasExplicitBlocker:
      documentRef.querySelector("[data-service-worker-update-blocker='true']") !== null,
  };
}
