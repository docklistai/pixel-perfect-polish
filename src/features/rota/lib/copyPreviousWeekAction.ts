import type { LiveCopyPreviousWeekPreview } from "../api/copyPreviousLiveRotaWeek";

export type CopyPreviousWeekConfirmation = {
  title: string;
  description: string;
  confirmLabel: string;
};

export function buildCopyPreviousWeekConfirmation(
  preview: LiveCopyPreviousWeekPreview,
): CopyPreviousWeekConfirmation {
  const replacement =
    preview.currentShiftCount === 0
      ? "This week currently has no draft shifts."
      : `This will replace ${preview.currentShiftCount} current draft shift${preview.currentShiftCount === 1 ? "" : "s"}.`;
  const copied = `${preview.sourceShiftCount} shift${preview.sourceShiftCount === 1 ? "" : "s"} will be copied from ${preview.previousWeekLabel} into ${preview.targetWeekLabel}.`;
  const open = `${preview.assignedShiftCount} assigned and ${preview.openShiftCount} open shift${preview.openShiftCount === 1 ? "" : "s"} will remain draft-only until you publish.`;

  return {
    title: "Copy last week into this draft?",
    description: `${copied} ${replacement} ${open} This does not publish the rota.`,
    confirmLabel: "Copy into draft",
  };
}

export async function requestLiveCopyPreviousWeekConfirmation({
  previewCopyPreviousWeek,
  requestCopyPreviousWeek,
}: {
  previewCopyPreviousWeek: () => Promise<LiveCopyPreviousWeekPreview>;
  requestCopyPreviousWeek: (preview: LiveCopyPreviousWeekPreview) => void;
}): Promise<LiveCopyPreviousWeekPreview> {
  const preview = await previewCopyPreviousWeek();
  requestCopyPreviousWeek(preview);
  return preview;
}
